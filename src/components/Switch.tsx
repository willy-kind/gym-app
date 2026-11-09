/** iOS-style on/off switch, with the whole row as the tap target. */
export function SwitchRow({ label, detail, on, onChange }: { label: string; detail?: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <li>
      <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left">
        <span className="min-w-0 flex-1">
          <span className="block">{label}</span>
          {detail && <span className="block text-[13px] text-label-2">{detail}</span>}
        </span>
        <span className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${on ? 'bg-success' : 'bg-surface-2'}`}>
          <span className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
        </span>
      </button>
    </li>
  )
}
