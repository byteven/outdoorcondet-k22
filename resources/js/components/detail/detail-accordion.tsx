import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type DetailAccordionProps = {
    description: string | null;
    items?: { name: string; quantity: number }[];
    className?: string;
};

export function DetailAccordion({
    description,
    items,
    className,
}: DetailAccordionProps) {
    const sections = [
        {
            key: 'description',
            title: 'Deskripsi',
            content: <DescriptionContent text={description} />,
        },
        {
            key: 'items',
            title: 'Perlengkapan dalam paket',
            content: <PackageItemsContent items={items ?? []} />,
        },
    ].filter((section) => section.key !== 'items' || (items?.length ?? 0) > 0);

    return (
        <div className={cn('overflow-hidden rounded-2xl border border-border bg-card', className)}>
            <Accordion sections={sections} />
        </div>
    );
}

type AccordionSection = {
    key: string;
    title: string;
    content: ReactNode;
};

function Accordion({ sections }: { sections: AccordionSection[] }) {
    const [openKey, setOpenKey] = useState<string | null>(
        () => sections[0]?.key ?? null,
    );

    return (
        <div className="divide-y divide-border/60">
            {sections.map((section) => (
                <Collapsible
                    key={section.key}
                    open={openKey === section.key}
                    onOpenChange={(open) =>
                        setOpenKey(open ? section.key : null)
                    }
                >
                    <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left text-lg font-semibold transition-colors hover:text-primary">
                        {section.title}
                        <ChevronDownIcon
                            className={cn(
                                'size-4 shrink-0 text-muted-foreground transition-transform',
                                openKey === section.key && 'rotate-180',
                            )}
                        />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                        <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                            {section.content}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            ))}
        </div>
    );
}

function DescriptionContent({ text }: { text: string | null }) {
    if (!text) {
        return <p>Belum ada deskripsi untuk alat ini.</p>;
    }

    return <p className="whitespace-pre-line">{text}</p>;
}

function PackageItemsContent({
    items,
}: {
    items: { name: string; quantity: number }[];
}) {
    return (
        <ul className="flex flex-col gap-2">
            {items.map((item, index) => (
                <li key={item.name + index} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary/60" />
                    <span>
                        {item.name}
                        <span className="font-medium text-primary">
                            {' '}
                            × {item.quantity}
                        </span>
                    </span>
                </li>
            ))}
        </ul>
    );
}
