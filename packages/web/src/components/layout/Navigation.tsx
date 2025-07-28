import React from 'react';
import Link from 'next/link';

export function Navigation() {
  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Clinical FIRE 🔥
          </Link>
          <div className="flex space-x-6">
            <Link href="/" className="text-sm hover:text-primary">
              Dashboard
            </Link>
            <Link href="/workflows" className="text-sm hover:text-primary">
              Workflows
            </Link>
            <Link href="/executions" className="text-sm hover:text-primary">
              Executions
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 