import { IconCheck } from "@/components/icons";

interface Block {
  id: string;
  position: number;
  type: "question" | "bonus_points" | "lose_points" | "skip_turn";
  revealed: boolean;
}

export function BlockGrid({ blocks, onSelect }: { blocks: Block[]; onSelect: (block: Block) => void }) {
  return (
    <div className="block-grid">
      {blocks.map((block) => (
        <button
          key={block.id}
          className="block-tile"
          disabled={block.revealed}
          onClick={() => onSelect(block)}
          aria-label={block.revealed ? `Bloco ${block.position + 1}, já revelado` : `Revelar bloco ${block.position + 1}`}
        >
          {block.revealed ? <IconCheck size={22} className="block-tile-check" /> : block.position + 1}
        </button>
      ))}
    </div>
  );
}
