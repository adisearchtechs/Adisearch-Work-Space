import { StatusReportSnapshotDetail } from '@/components/common/workspace/status-report-snapshot-detail';

export default async function StatusReportSnapshotPage({
   params,
}: {
   params: Promise<{ snapshotId: string }>;
}) {
   const { snapshotId } = await params;
   return <StatusReportSnapshotDetail snapshotId={snapshotId} />;
}
