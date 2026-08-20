import clsx from 'clsx';
import Icon from './Icon';

const SIZES = { sm: '0.9rem', md: '1.25rem', lg: '2rem' };

export default function Spinner({ size = 'md', className }) {
  return (
    <Icon
      name="progress_activity"
      size={SIZES[size]}
      className={clsx('animate-spin text-primary', className)}
    />
  );
}
