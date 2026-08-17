"use client";

import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Container } from "@/components/layout/Container";

export function AuthPageShell({
  title,
  subtitle,
  tabs,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  tabs?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Container size="lg">
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
        <div className="w-full max-w-[400px]">
          <div className="overflow-hidden rounded-organic-xl bg-surface">
            {tabs}
            <div className="space-y-6 px-6 py-8 sm:px-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <BrandLogo variant="full" size="lg" />
                <div className="space-y-1.5">
                  <h1 className="text-xl font-semibold tracking-tight text-text">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="text-sm leading-relaxed text-text-muted">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              </div>
              {children}
            </div>
          </div>
          {footer ? (
            <p className="mt-6 text-center text-xs text-text-subtle">{footer}</p>
          ) : null}
        </div>
      </div>
    </Container>
  );
}
