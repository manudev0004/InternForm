"use client";

import {useRouter} from 'next/navigation';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import { useAuth } from '@/components/auth/auth-provider';

const signInSchema = z.object({
  email: z.string().email({message: 'Please enter a valid email address.'}),
  password: z.string().min(6, {message: 'Password must be at least 6 characters.'}),
});

export function SignInPage() {
  const router = useRouter();
  const { login } = useAuth();
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (values: z.infer<typeof signInSchema>) => {
    if (values.email === 'admin@example.com' && values.password === 'password') {
      login(values.email, 'admin');
      router.push('/admin');
    } else if (values.email === 'intern@example.com' && values.password === 'password') {
      login(values.email, 'intern');
      router.push('/intern');
    } else if (values.email === 'guest@example.com' && values.password === 'password') {
      login(values.email, 'guest');
      router.push('/guest');
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <div className="container flex w-full max-w-[350px] flex-col gap-6 p-6">
      <Card>
        <CardHeader className="flex flex-col space-y-1.5">
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Enter your email and password to sign in to your account.
            <br />
            Use:
            <ul>
              <li>admin@example.com / password</li>
              <li>intern@example.com / password</li>
              <li>guest@example.com / password</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Sign In</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
