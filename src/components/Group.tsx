import type { ReactNode } from 'react';

interface GroupProps {
  id: string;
  title: string;
  children: ReactNode;
}

export function Group({ id, title, children }: GroupProps) {
  const headingId = `${id}-title`;
  return (
    <section className="group" aria-labelledby={headingId}>
      <h2 className="group-title" id={headingId}>
        {title}
      </h2>
      {children}
    </section>
  );
}
