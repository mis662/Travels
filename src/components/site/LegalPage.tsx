import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <PageHeader title={title} subtitle={`Last updated: ${updated}`} />
      <article className="container-x prose-legal max-w-3xl py-10">
        <p className="rounded-lg border border-accent-300 bg-accent-50 p-3 text-sm">
          Placeholder text — please review and edit this page (and get legal advice) before going live.
        </p>
        {children}
      </article>
    </>
  );
}
