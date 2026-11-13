"use client";

import { useActionState } from "react";
import { submitContactAction, type ContactState } from "@/actions/contact";
import { aria, Field, FormMessage } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ContactForm({ defaultSubject = "" }: { defaultSubject?: string }) {
  const [state, action] = useActionState<ContactState, FormData>(submitContactAction, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};

  if (state.ok) {
    return <FormMessage success="Thank you! We have received your message and will get back to you shortly." />;
  }

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2"><FormMessage error={e._form} /></div>
      <Field id="name" label="Name" required error={e.name}>
        <input {...aria("name", e.name)} className="input" autoComplete="name" defaultValue={v.name} />
      </Field>
      <Field id="mobile" label="Mobile" required error={e.mobile}>
        <input {...aria("mobile", e.mobile)} className="input" type="tel" inputMode="numeric" autoComplete="tel-national" defaultValue={v.mobile} />
      </Field>
      <Field id="email" label="Email (optional)" error={e.email}>
        <input {...aria("email", e.email)} className="input" type="email" autoComplete="email" defaultValue={v.email} />
      </Field>
      <Field id="subject" label="Subject" error={e.subject}>
        <input {...aria("subject", e.subject)} className="input" defaultValue={v.subject ?? defaultSubject} />
      </Field>
      <Field id="message" label="Message" required error={e.message} className="sm:col-span-2">
        <textarea {...aria("message", e.message)} className="input" rows={5} defaultValue={v.message} />
      </Field>
      <div className="hidden" aria-hidden="true">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="sm:col-span-2">
        <SubmitButton pendingText="Sending…">Send message</SubmitButton>
      </div>
    </form>
  );
}
