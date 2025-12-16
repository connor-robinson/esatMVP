"use client";

import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({ title, description, className }: PageHeaderProps) {
  return (
    <div className={"py-2 space-y-1 " + (className || "")}> 
      <h1 className="text-xl font-semibold uppercase tracking-wider text-white/70">
        {title}
      </h1>
      {description ? (
        <p className="text-sm text-white/50 max-w-2xl">
          {description}
        </p>
      ) : null}
    </div>
  );
}


