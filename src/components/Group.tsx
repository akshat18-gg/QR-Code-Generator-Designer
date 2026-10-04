import type { ReactNode } from 'react';

interface GroupProps {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}

export function Group({ id, title, aside, children }: GroupProps) {
  const headingId = `${id}-title`;
  return (
    <section className="group" id={id} aria-labelledby={headingId}>
      <div className="group-head">
        <h2 className="group-title" id={headingId}>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
