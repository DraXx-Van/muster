'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ChevronDown, LogOut, Moon, Sun, UserCog } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AccountDialog } from './AccountDialog';
import { PersonAvatar } from './kit';
import { Logo } from './visual';

export function Brand({ href = '/' }: { href?: string }) {
  return <Link href={href}><Logo /></Link>;
}

export function ThemeToggleItem() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  return (
    <DropdownMenuItem onClick={() => setTheme(dark ? 'light' : 'dark')}>
      {dark ? <Sun /> : <Moon />} {dark ? 'Switch to light mode' : 'Switch to dark mode'}
    </DropdownMenuItem>
  );
}

/** Account menu used in every area: your account (photo, name, phone), theme and sign out. */
export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!profile) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<button className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-2.5 shadow-sm transition-colors hover:bg-muted/60" aria-label="Account menu" />}>
          <PersonAvatar name={profile.full_name} src={profile.avatar_url} size="sm" />
          {!compact && <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">{profile.full_name}</span>}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <span className="block truncate text-sm font-semibold text-foreground">{profile.full_name}</span>
            <span className="block truncate text-xs capitalize text-muted-foreground">{profile.email} · {profile.account_type}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}><UserCog /> Your account and photo</DropdownMenuItem>
          <ThemeToggleItem />
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={async () => { await signOut(); router.replace('/login'); }}><LogOut /> Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AccountDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Brand href="/" />
        <div className="ml-auto flex items-center gap-2.5">{children}<AccountMenu /></div>
      </div>
    </header>
  );
}
