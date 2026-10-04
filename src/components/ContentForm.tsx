import { useState, type Dispatch } from 'react';
import { DENSE_VERSION } from '../lib/qrData';
import type { QrStatus } from '../lib/status';
import type { WifiSecurity } from '../lib/types';
import type { Action, EditorState } from '../state/editor';
import { Segmented } from './Segmented';
import { TextField } from './TextField';

interface ContentFormProps {
  state: EditorState;
  errors: Partial<Record<string, string>>;
  status: QrStatus;
  dispatch: Dispatch<Action>;
}

const SECURITY_OPTIONS: readonly { value: WifiSecurity; label: string }[] = [
  { value: 'WPA', label: 'WPA/WPA2' },
  { value: 'WEP', label: 'WEP' },
  { value: 'nopass', label: 'None' },
];

export function ContentForm({ state, errors, status, dispatch }: ContentFormProps) {
  const { type, inputs, touched } = state;
  const [showPassword, setShowPassword] = useState(false);

  function field(name: string) {
    const key = `${type}.${name}`;
    return {
      id: `${type}-${name}`,
      error: touched[key] ? errors[name] : undefined,
      onBlur: () => dispatch({ type: 'touch', field: key }),
    };
  }

  let body;
  switch (type) {
    case 'url':
      body = (
        <TextField
          {...field('url')}
          label="Web address"
          value={inputs.url.url}
          inputMode="url"
          placeholder="example.com"
          hint="https:// is added if you leave it out."
          onChange={(url) => dispatch({ type: 'setInput', qrType: 'url', patch: { url } })}
        />
      );
      break;

    case 'text': {
      const { text } = inputs.text;
      const characters = [...text].length;
      const dense = status.kind === 'ready' && status.version > DENSE_VERSION;
      body = (
        <TextField
          {...field('text')}
          label="Text"
          value={text}
          multiline
          hint={
            <>
              <span className="mono">
                {characters} {characters === 1 ? 'character' : 'characters'}
              </span>
              {dense && (
                <span className="hint-warn">
                  {' '}
                  · Long text makes a dense code. Print it larger or shorten it.
                </span>
              )}
            </>
          }
          onChange={(value) =>
            dispatch({ type: 'setInput', qrType: 'text', patch: { text: value } })
          }
        />
      );
      break;
    }

    case 'email': {
      const { to, subject, body: message } = inputs.email;
      body = (
        <>
          <TextField
            {...field('to')}
            label="To"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={to}
            onChange={(value) =>
              dispatch({ type: 'setInput', qrType: 'email', patch: { to: value } })
            }
          />
          <TextField
            {...field('subject')}
            label="Subject"
            optional
            value={subject}
            onChange={(value) =>
              dispatch({ type: 'setInput', qrType: 'email', patch: { subject: value } })
            }
          />
          <TextField
            {...field('body')}
            label="Message"
            optional
            multiline
            value={message}
            onChange={(value) =>
              dispatch({ type: 'setInput', qrType: 'email', patch: { body: value } })
            }
          />
        </>
      );
      break;
    }

    case 'phone':
      body = (
        <TextField
          {...field('phone')}
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          hint="Include the country code if it will be scanned abroad."
          value={inputs.phone.phone}
          onChange={(phone) => dispatch({ type: 'setInput', qrType: 'phone', patch: { phone } })}
        />
      );
      break;

    case 'wifi': {
      const { ssid, security, password, hidden } = inputs.wifi;
      const passwordField = field('password');
      body = (
        <>
          <TextField
            {...field('ssid')}
            label="Network name"
            value={ssid}
            onChange={(value) =>
              dispatch({ type: 'setInput', qrType: 'wifi', patch: { ssid: value } })
            }
          />
          <Segmented
            legend="Security"
            value={security}
            options={SECURITY_OPTIONS}
            onChange={(value) =>
              dispatch({ type: 'setInput', qrType: 'wifi', patch: { security: value } })
            }
          />
          {security !== 'nopass' && (
            <TextField
              {...passwordField}
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="off"
              value={password}
              onChange={(value) =>
                dispatch({ type: 'setInput', qrType: 'wifi', patch: { password: value } })
              }
              trailing={
                <button
                  type="button"
                  className="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-controls={passwordField.id}
                  onClick={() => setShowPassword((shown) => !shown)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              }
            />
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={hidden}
              onChange={(event) =>
                dispatch({
                  type: 'setInput',
                  qrType: 'wifi',
                  patch: { hidden: event.target.checked },
                })
              }
            />
            Hidden network
          </label>
        </>
      );
      break;
    }
  }

  return <div className="stack">{body}</div>;
}
