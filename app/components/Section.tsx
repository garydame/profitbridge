"use client";

import React from "react";

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export default function Section({ title, children }: SectionProps) {
  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
