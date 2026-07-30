import { ProblemForm } from "@/components/problems/problem-form";
import { PageHeader } from "@/components/shared/page-header";

export default function NewProblemPage() {
  return (
    <div>
      <PageHeader title="New problem" description="Capture a customer problem." />
      <ProblemForm mode="create" />
    </div>
  );
}
