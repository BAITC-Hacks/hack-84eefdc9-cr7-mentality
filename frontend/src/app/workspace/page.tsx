import { Suspense } from "react";
import { Workspace } from "@/features/workspace/Workspace";
import { Loading } from "@/components/ui/Status";
export default function WorkspacePage() {
  return (
    <Suspense fallback={<Loading />}>
      <Workspace />
    </Suspense>
  );
}
