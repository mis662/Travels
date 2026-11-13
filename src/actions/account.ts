"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/session";
import { createCustomerSession, destroyCustomerSession, safeNext } from "@/lib/auth/customer-session";
import { customerLoginSchema, customerSignupSchema } from "@/lib/validation/account";
import { firstError, formObject, type ActionState } from "@/lib/action-state";
import { clientIp, recordFailure, tooManyFailures } from "@/lib/rate-limit";

const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7Ywlx7gYwbz0wq8G4nV0f3fG5V1e3eW";

export async function customerSignupAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  // Count only accounts actually created (not typos/retries), with a generous cap because
  // many mobile users in India share one public IP.
  const signupKey = `customer-signups-created:${await clientIp()}`;
  if (tooManyFailures(signupKey, 30)) {
    return { error: "Too many new accounts from this network. Please try again in an hour." };
  }
  const parsed = customerSignupSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { name, mobile, email, password } = parsed.data;

  const taken = await prisma.customer.findFirst({
    where: { OR: [{ mobile }, ...(email ? [{ email }] : [])] },
    select: { mobile: true },
  });
  if (taken) {
    return { error: `An account with this ${taken.mobile === mobile ? "mobile number" : "email"} already exists. Please sign in.` };
  }

  let customerId: string;
  try {
    const c = await prisma.customer.create({
      data: { name, mobile, email: email ?? null, passwordHash: await hashPassword(password) },
    });
    customerId = c.id;
    recordFailure(signupKey, 60 * 60_000); // counts a created account
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const field = String(e.meta?.target ?? "").includes("email") ? "email" : "mobile number";
      return { error: `An account with this ${field} already exists. Please sign in.` };
    }
    throw e;
  }
  await createCustomerSession(customerId);
  redirect(safeNext(String(fd.get("next") ?? "")));
}

export async function customerLoginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = customerLoginSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { login, password } = parsed.data;

  const keys = [`customer-login:${await clientIp()}`, `customer-login:${login}`];
  if (keys.some((k) => tooManyFailures(k, 10))) return { error: "Too many wrong attempts. Try again in 15 minutes." };

  const customer = await prisma.customer.findFirst({
    where: login.includes("@") ? { email: login } : { mobile: login },
  });
  const ok = await verifyPassword(password, customer?.passwordHash ?? DUMMY_HASH);
  if (!customer || !ok) {
    keys.forEach((k) => recordFailure(k, 15 * 60_000));
    return { error: "Wrong mobile/email or password" };
  }
  await createCustomerSession(customer.id);
  redirect(safeNext(String(fd.get("next") ?? "")));
}

export async function customerLogoutAction() {
  await destroyCustomerSession();
  redirect("/");
}
