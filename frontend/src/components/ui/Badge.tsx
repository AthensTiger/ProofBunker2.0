interface BadgeProps {
  variant: 'pending' | 'rejected' | 'approved' | 'info';
  children: React.ReactNode;
}

const variantClasses: Record<BadgeProps['variant'], string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
