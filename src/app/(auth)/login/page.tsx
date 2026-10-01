'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, ClipboardList, HandHeart, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { HOME, useAuth } from '@/lib/auth';
import type { AccountType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FieldError } from '@/components/common/kit';
import { Logo } from '@/components/common/visual';
import { ProductMock } from '@/components/landing/ProductMock';

const signInSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});
const signUpSchema = z.object({
  accountType: z.enum(['coordinator', 'volunteer']),
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().refine((v) => v === '' || /^\+?[\d\s-]{10,15}$/.test(v), 'Enter a valid phone number'),
  password: z.string().min(6, 'At least 6 characters'),
});
type SignIn = z.infer<typeof signInSchema>;
type SignUp = z.infer<typeof signUpSchema>;

const TYPES: { value: Exclude<AccountType, 'attendee'>; title: string; hint: string; icon: typeof ClipboardList }[] = [
  { value: 'coordinator', title: 'Coordinator', hint: 'I organise events and manage a crew', icon: ClipboardList },
  { value: 'volunteer', title: 'Volunteer', hint: 'I help out at events', icon: HandHeart },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, loading, signIn, signUp } = useAuth();
  const [tab, setTab] = useState<'in' | 'up'>(params.get('mode') === 'signup' ? 'up' : 'in');
  const [busy, setBusy] = useState(false);

  const nextPath = () => {
    const n = params.get('next');
    return n && n.startsWith('/') && !n.startsWith('//') ? n : null;
  };

  // already signed in -> go straight to your area
  useEffect(() => {
    if (!loading && user && profile) router.replace(nextPath() ?? HOME[profile.account_type]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, profile, router]);

  const inForm = useForm<SignIn>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } });
  const upForm = useForm<SignUp>({ resolver: zodResolver(signUpSchema), defaultValues: { accountType: params.get('next')?.startsWith('/v') ? 'volunteer' : 'coordinator', fullName: '', email: '', phone: '', password: '' } });

  const doSignIn = async (v: SignIn) => {
    setBusy(true);
    try {
      const p = await signIn(v.email, v.password);
      router.replace(nextPath() ?? HOME[p.account_type]);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not sign in'); }
    finally { setBusy(false); }
  };

  const doSignUp = async (v: SignUp) => {
    setBusy(true);
    try {
      const p = await signUp({ email: v.email, password: v.password, fullName: v.fullName, phone: v.phone, accountType: v.accountType });
      toast.success(`Welcome, ${p.full_name.split(' ')[0]}!`);
      router.replace(nextPath() ?? HOME[p.account_type]);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not create the account'); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      {/* form side */}
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to home</Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <h1 className="text-[28px] font-semibold tracking-tight">{tab === 'in' ? 'Welcome back' : 'Create your account'}</h1>
            <p className="mt-1.5 text-[15px] text-muted-foreground">{tab === 'in' ? 'Sign in to manage your events or your shifts.' : 'Free to start. Pick the account that fits you.'}</p>

            <Tabs value={tab} onValueChange={(v) => setTab(v as 'in' | 'up')} className="mt-6">
              <TabsList className="w-full"><TabsTrigger value="in" className="flex-1">Sign in</TabsTrigger><TabsTrigger value="up" className="flex-1">Create account</TabsTrigger></TabsList>
            </Tabs>

            {tab === 'in' ? (
              <form onSubmit={inForm.handleSubmit(doSignIn)} className="mt-6 space-y-4" noValidate>
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" autoComplete="email" className="h-11" aria-invalid={!!inForm.formState.errors.email} {...inForm.register('email')} />
                  <FieldError message={inForm.formState.errors.email?.message} />
                </div>
                <div>
                  <Label htmlFor="si-pass">Password</Label>
                  <Input id="si-pass" type="password" autoComplete="current-password" className="h-11" aria-invalid={!!inForm.formState.errors.password} {...inForm.register('password')} />
                  <FieldError message={inForm.formState.errors.password?.message} />
                </div>
                <Button type="submit" size="lg" className="h-11 w-full text-[15px]" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Sign in</Button>
              </form>
            ) : (
              <form onSubmit={upForm.handleSubmit(doSignUp)} className="mt-6 space-y-4" noValidate>
                <Controller control={upForm.control} name="accountType" render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2.5">
                    {TYPES.map((t) => (
                      <button type="button" key={t.value} aria-pressed={field.value === t.value} onClick={() => field.onChange(t.value)}
                        className={cn('flex flex-col items-start gap-2 rounded-2xl border bg-card p-3.5 text-left transition-all', field.value === t.value ? 'border-primary ring-2 ring-primary/20' : 'hover:bg-muted/50')}>
                        <span className={cn('flex size-8 items-center justify-center rounded-lg', field.value === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}><t.icon className="size-4" /></span>
                        <span><span className="block text-sm font-semibold">{t.title}</span><span className="text-xs leading-snug text-muted-foreground">{t.hint}</span></span>
                      </button>
                    ))}
                  </div>
                )} />
                <div>
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" autoComplete="name" className="h-11" aria-invalid={!!upForm.formState.errors.fullName} {...upForm.register('fullName')} />
                  <FieldError message={upForm.formState.errors.fullName?.message} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" autoComplete="email" className="h-11" aria-invalid={!!upForm.formState.errors.email} {...upForm.register('email')} />
                    <FieldError message={upForm.formState.errors.email?.message} />
                  </div>
                  <div>
                    <Label htmlFor="su-phone">Phone (optional)</Label>
                    <Input id="su-phone" inputMode="tel" autoComplete="tel" className="h-11" aria-invalid={!!upForm.formState.errors.phone} {...upForm.register('phone')} />
                    <FieldError message={upForm.formState.errors.phone?.message} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="su-pass">Password</Label>
                  <Input id="su-pass" type="password" autoComplete="new-password" className="h-11" aria-invalid={!!upForm.formState.errors.password} {...upForm.register('password')} />
                  <FieldError message={upForm.formState.errors.password?.message} />
                </div>
                <Button type="submit" size="lg" className="h-11 w-full text-[15px]" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Create account</Button>
              </form>
            )}

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-accent p-3.5 text-[13px] leading-snug text-accent-foreground">
              <QrCode className="mt-0.5 size-4 shrink-0 text-primary" />
              <p><span className="font-semibold">Attending an event?</span> You do not need an account. Scan the event&apos;s QR code and pick a name.</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* art side */}
      <div className="relative hidden overflow-hidden border-l bg-linear-to-br from-indigo-50 via-sky-50 to-white p-12 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 lg:flex lg:flex-col lg:justify-center">
        <div className="grid-dots absolute inset-0 opacity-60" />
        <div className="relative mx-auto w-full max-w-[560px]">
          <h2 className="mb-8 max-w-md text-3xl font-semibold leading-tight tracking-tight text-balance">The right volunteer in the right place, even when plans change.</h2>
          <ProductMock />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
