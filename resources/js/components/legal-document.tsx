import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MarkdownBlock =
    | { type: 'heading'; level: 2 | 3; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'list'; ordered: boolean; items: string[] };

function renderInline(text: string): ReactNode[] {
    return text
        .split(/(\*\*[^*]+\*\*)/g)
        .filter((part) => part !== '')
        .map((part, index) =>
            part.startsWith('**') && part.endsWith('**') ? (
                <strong key={index} className="font-semibold text-foreground">
                    {part.slice(2, -2)}
                </strong>
            ) : (
                <span key={index}>{part}</span>
            ),
        );
}

function parseMarkdown(source: string): MarkdownBlock[] {
    const blocks: MarkdownBlock[] = [];
    const lines = source.split(/\r?\n/);

    let paragraph: string[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;

    const flushParagraph = () => {
        if (paragraph.length > 0) {
            blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
            paragraph = [];
        }
    };

    const flushList = () => {
        if (list) {
            blocks.push({ type: 'list', ...list });
            list = null;
        }
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (line === '') {
            flushParagraph();
            flushList();
            continue;
        }

        const heading = /^(#{1,3})\s+(.*)$/.exec(line);

        if (heading) {
            flushParagraph();
            flushList();
            blocks.push({
                type: 'heading',
                level: heading[1].length >= 3 ? 3 : 2,
                text: heading[2],
            });
            continue;
        }

        const bullet = /^[-*]\s+(.*)$/.exec(line);

        if (bullet) {
            flushParagraph();

            if (!list || list.ordered) {
                flushList();
                list = { ordered: false, items: [] };
            }

            list.items.push(bullet[1]);
            continue;
        }

        const ordered = /^\d+\.\s+(.*)$/.exec(line);

        if (ordered) {
            flushParagraph();

            if (!list || !list.ordered) {
                flushList();
                list = { ordered: true, items: [] };
            }

            list.items.push(ordered[1]);
            continue;
        }

        if (list) {
            list.items[list.items.length - 1] += ` ${line}`;
            continue;
        }

        paragraph.push(line);
    }

    flushParagraph();
    flushList();

    return blocks;
}

/**
 * Menampilkan dokumen legal (syarat & ketentuan / kebijakan privasi)
 * dari berkas markdown agar formatnya konsisten di setiap halaman.
 */
export function LegalDocument({ source }: { source: string }) {
    const blocks = parseMarkdown(source);

    return (
        <div className="space-y-3">
            {blocks.map((block, index) => {
                if (block.type === 'heading') {
                    const className = cn(
                        'mt-6 text-lg font-semibold text-foreground first:mt-0',
                    );

                    return block.level === 3 ? (
                        <h3 key={index} className={className}>
                            {renderInline(block.text)}
                        </h3>
                    ) : (
                        <h2 key={index} className={className}>
                            {renderInline(block.text)}
                        </h2>
                    );
                }

                if (block.type === 'list') {
                    const className = cn(
                        'space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground',
                    );

                    return block.ordered ? (
                        <ol
                            key={index}
                            className={cn('list-decimal', className)}
                        >
                            {block.items.map((item, itemIndex) => (
                                <li key={itemIndex}>{renderInline(item)}</li>
                            ))}
                        </ol>
                    ) : (
                        <ul key={index} className={cn('list-disc', className)}>
                            {block.items.map((item, itemIndex) => (
                                <li key={itemIndex}>{renderInline(item)}</li>
                            ))}
                        </ul>
                    );
                }

                return (
                    <p
                        key={index}
                        className="text-sm leading-relaxed text-muted-foreground"
                    >
                        {renderInline(block.text)}
                    </p>
                );
            })}
        </div>
    );
}
