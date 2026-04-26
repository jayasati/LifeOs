import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const swatches = [
  { name: "background", token: "bg-background", text: "text-foreground" },
  { name: "card", token: "bg-card", text: "text-card-foreground" },
  { name: "popover", token: "bg-popover", text: "text-popover-foreground" },
  { name: "primary", token: "bg-primary", text: "text-primary-foreground" },
  { name: "secondary", token: "bg-secondary", text: "text-secondary-foreground" },
  { name: "muted", token: "bg-muted", text: "text-muted-foreground" },
  { name: "accent", token: "bg-accent", text: "text-accent-foreground" },
  { name: "destructive", token: "bg-destructive", text: "text-destructive-foreground" },
  { name: "border", token: "bg-border", text: "text-foreground" },
  { name: "input", token: "bg-input", text: "text-foreground" },
];

const kpiSwatches = [
  { name: "kpi-green", token: "bg-kpi-green" },
  { name: "kpi-orange", token: "bg-kpi-orange" },
  { name: "kpi-red", token: "bg-kpi-red" },
  { name: "kpi-purple", token: "bg-kpi-purple" },
  { name: "kpi-violet", token: "bg-kpi-violet" },
];

const violetRamp = [
  { name: "violet-400", token: "bg-violet-400" },
  { name: "violet-500", token: "bg-violet-500" },
  { name: "violet-600", token: "bg-violet-600" },
];

export default function TokensPage() {
  return (
    <div className="min-h-screen bg-background p-10 text-foreground">
      <div className="mx-auto max-w-6xl space-y-12">
        <header>
          <p className="text-sm text-muted-foreground">phase 0 verification</p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight">
            FocusFlow <span className="text-gradient-violet">Design Tokens</span>
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Visual swatches for the navy/violet palette plus every shadcn primitive
            generated in Phase 0. Delete this route after the shell ships.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Surface tokens</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {swatches.map((s) => (
              <div
                key={s.name}
                className={`${s.token} ${s.text} flex h-24 flex-col items-start justify-end rounded-lg border border-border p-3`}
              >
                <span className="text-xs opacity-70">{s.name}</span>
                <span className="font-mono text-sm">{s.token}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">KPI accents</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {kpiSwatches.map((s) => (
              <div
                key={s.name}
                className={`${s.token} flex h-24 flex-col items-start justify-end rounded-lg p-3 text-white`}
              >
                <span className="text-xs opacity-80">{s.name}</span>
                <span className="font-mono text-sm">{s.token}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Violet ramp + gradient</h2>
          <div className="grid grid-cols-3 gap-3">
            {violetRamp.map((s) => (
              <div
                key={s.name}
                className={`${s.token} flex h-20 flex-col items-start justify-end rounded-lg p-3 text-white`}
              >
                <span className="text-xs opacity-80">{s.name}</span>
                <span className="font-mono text-sm">{s.token}</span>
              </div>
            ))}
          </div>
          <div className="bg-gradient-violet flex h-24 items-center justify-center rounded-lg text-lg font-semibold text-white">
            bg-gradient-violet
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="icon">
              <span className="text-base">+</span>
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Badges</h2>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Inputs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" placeholder="Tell us a bit about yourself…" />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="med">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-7">
              <Checkbox id="terms" />
              <Label htmlFor="terms">Accept terms</Label>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Card</h2>
          <Card>
            <CardHeader>
              <CardTitle>Productivity Overview</CardTitle>
              <CardDescription>
                A glance at where the navy card surface lands against the violet
                primary.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>SV</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Weekly progress</span>
                  <span className="text-muted-foreground">68%</span>
                </div>
                <Progress value={68} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Tabs</h2>
          <Tabs defaultValue="day">
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
            <TabsContent value="day" className="text-muted-foreground">
              Day view content.
            </TabsContent>
            <TabsContent value="week" className="text-muted-foreground">
              Week view content.
            </TabsContent>
            <TabsContent value="month" className="text-muted-foreground">
              Month view content.
            </TabsContent>
            <TabsContent value="year" className="text-muted-foreground">
              Year view content.
            </TabsContent>
          </Tabs>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Skeletons</h2>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </section>

        <footer className="pb-10 pt-6 text-sm text-muted-foreground">
          If every section above renders with the violet/navy palette and no console
          errors, Phase 0 is good. Move on to Phase 1.
        </footer>
      </div>
    </div>
  );
}
