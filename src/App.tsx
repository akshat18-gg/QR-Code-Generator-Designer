import { Group } from './components/Group';

export default function App() {
  return (
    <div className="app">
      <header className="masthead">
        <h1 className="wordmark">
          Quiet Zone <span>QR codes that scan</span>
        </h1>
      </header>
      <main className="workspace">
        <div className="controls">
          <Group id="content" title="Content">
            <p>Content form goes here.</p>
          </Group>
          <Group id="pattern" title="Pattern">
            <p>Pattern controls go here.</p>
          </Group>
          <Group id="colour" title="Colour">
            <p>Colour controls go here.</p>
          </Group>
          <Group id="logo" title="Logo">
            <p>Logo controls go here.</p>
          </Group>
        </div>
        <aside className="output" aria-label="Preview and export">
          <div className="output-inner">
            <Group id="export" title="Export">
              <p>Preview and export go here.</p>
            </Group>
          </div>
        </aside>
      </main>
    </div>
  );
}
