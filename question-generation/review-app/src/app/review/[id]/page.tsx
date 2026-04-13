import { ReviewWorkspace } from "@/components/ReviewWorkspace";

type Props = {
  params: { id: string };
};

export default function ReviewQuestionPage({ params }: Props) {
  return <ReviewWorkspace initialQuestionId={params.id} />;
}
