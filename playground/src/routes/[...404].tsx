export default function NotFound() {
  return (
    <div class="min-h-screen bg-background text-foreground">
      <div class="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 py-12">
        <h1 class="text-2xl font-semibold">Not found</h1>
        <a href="/" class="text-primary underline">
          Go home
        </a>
      </div>
    </div>
  );
}
