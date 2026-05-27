import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-cyan-950 text-cyan-100',
        muted: 'bg-slate-800 text-slate-300',
        outline: 'border border-slate-700 text-slate-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
