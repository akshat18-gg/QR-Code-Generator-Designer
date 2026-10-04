import { TYPE_LABELS } from '../lib/types';
import { describeEntry, type RecentItem } from '../state/recent';

interface RecentListProps {
  items: RecentItem[];
  problem: string | null;
  onLoad: (item: RecentItem) => void;
  onRemove: (id: string) => void;
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export function RecentList({ items, problem, onLoad, onRemove }: RecentListProps) {
  return (
    <div className="stack">
      {problem && (
        <p className="error" role="alert">
          {problem}
        </p>
      )}
      {items.length === 0 ? (
        <p className="hint recent-empty">Codes you download or copy show up here.</p>
      ) : (
        <ul className="recent-list">
          {items.map((item) => {
            const summary = describeEntry(item);
            return (
              <li key={item.id} className="recent-item">
                <button type="button" className="recent-load" onClick={() => onLoad(item)}>
                  <img src={item.thumbnail} alt="" width={48} height={48} />
                  <span className="recent-text">
                    <span className="recent-type">{TYPE_LABELS[item.type]}</span>
                    <span className="recent-summary">{summary}</span>
                    <time className="recent-time" dateTime={new Date(item.savedAt).toISOString()}>
                      {dateFormat.format(item.savedAt)}
                    </time>
                  </span>
                </button>
                <button
                  type="button"
                  className="button button-quiet recent-remove"
                  aria-label={`Remove ${TYPE_LABELS[item.type]} code: ${summary}`}
                  onClick={() => onRemove(item.id)}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
