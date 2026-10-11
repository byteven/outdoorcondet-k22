import { Head } from '@inertiajs/react';
import { LayoutGrid } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { dashboard } from '@/routes/admin';

export default function Dashboard() {
    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <EmptyState
                    icon={LayoutGrid}
                    title="Belum ada ringkasan"
                    description="Ringkasan dan metrik dashboard."
                />
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
