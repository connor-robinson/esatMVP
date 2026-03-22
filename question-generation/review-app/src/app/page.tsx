import { ReviewDashboard } from "@/components/ReviewDashboard";

type HomeProps = {
  searchParams: { page?: string };
};

export default function HomePage({ searchParams }: HomeProps) {
  const raw = parseInt(searchParams.page ?? "1", 10);
  const page = Number.isFinite(raw) && raw >= 1 ? raw : 1;

  return <ReviewDashboard page={page} />;
}
