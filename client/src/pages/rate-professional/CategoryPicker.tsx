import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useResource } from "../../utils/api";

export default function CategoryPicker({ selected, onSelect }: {
  selected: string[];
  onSelect: (name: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [active, setActive] = useState(-1);
  const [placement, setPlacement] = useState({ above: false, listHeight: undefined as number | undefined });
  const name = query.normalize("NFC").trim().replace(/\s+/g, " ");
  const result = useResource<string[]>("/rating-categories?" + new URLSearchParams({ q: name }));
  const alreadySelected = selected.some(item => item.toLowerCase() === name.toLowerCase());
  const exact = result.data?.find(item => item.toLowerCase() === name.toLowerCase());
  const canAdd = !alreadySelected && /[\p{L}\p{N}]/u.test(name) && !/[\p{Cc}]/u.test(name);
  const options = (result.data ?? []).filter(item => !selected.some(value => item.toLowerCase() === value.toLowerCase()));
  const highlighted = options[active] ? active : -1;

  useLayoutEffect(() => {
    if (!open || adding) return;

    function positionPopup() {
      const field = input.current;
      const rows = list.current;
      const panel = popup.current;
      if (!field || !rows || !panel) return;
      const bounds = field.getBoundingClientRect();
      const above = bounds.top;
      const below = window.innerHeight - bounds.bottom;
      const footerSpace = panel.offsetHeight - rows.clientHeight + 12;
      const tenRows = (rows.firstElementChild?.getBoundingClientRect().height ?? 0) * 10;
      const wanted = Math.min(rows.scrollHeight, tenRows) + footerSpace;
      const opensAbove = below < wanted && above > below;
      const listHeight = Math.max(0, (opensAbove ? above : below) - footerSpace);
      setPlacement(previous => previous.above === opensAbove && previous.listHeight === listHeight
        ? previous : { above: opensAbove, listHeight });
    }

    positionPopup();
    window.addEventListener("resize", positionPopup);
    window.addEventListener("scroll", positionPopup);
    return () => {
      window.removeEventListener("resize", positionPopup);
      window.removeEventListener("scroll", positionPopup);
    };
  }, [adding, open, options.length]);

  useEffect(() => {
    const viewport = list.current;
    const row = viewport?.children[highlighted] as HTMLElement | undefined;
    if (!open || !viewport || !row) return;
    const rowEnd = row.offsetTop + row.offsetHeight;
    if (row.offsetTop < viewport.scrollTop) viewport.scrollTop = row.offsetTop;
    else if (rowEnd > viewport.scrollTop + viewport.clientHeight) viewport.scrollTop = rowEnd - viewport.clientHeight;
  }, [highlighted, open]);

  function choose(label: string) {
    onSelect(label);
    setQuery("");
    setOpen(false);
    setAdding(false);
    setActive(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (adding) {
      if (event.key === "Enter") {
        event.preventDefault();
        if (canAdd) choose(exact ?? name);
      } else if (event.key === "Escape") {
        setAdding(false);
        setQuery("");
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        setOpen(true);
        if (!options.length) break;
        const down = event.key === "ArrowDown";
        const index = !open || highlighted < 0 ? (down ? 0 : options.length - 1) : highlighted + (down ? 1 : -1);
        setActive((index + options.length) % options.length);
        break;
      }
      case "Enter":
        event.preventDefault();
        if (open && options.length) choose(options[Math.max(0, highlighted)]);
        else if (open && result.data && canAdd) startAdding();
        else setOpen(true);
        break;
      case "Escape":
        setOpen(false);
        setActive(-1);
        break;
    }
  }

  function startAdding() {
    input.current?.focus();
    setOpen(false);
    setActive(-1);
    setAdding(true);
  }

  return <div onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[10rem] flex-1">
        <label htmlFor={id} className="sr-only">{adding ? "New category name" : "Search rating categories"}</label>
        <input id={id} ref={input} role={adding ? undefined : "combobox"} aria-autocomplete={adding ? undefined : "list"}
          aria-expanded={adding ? undefined : open} aria-controls={adding ? undefined : id + "-options"}
          aria-activedescendant={!adding && open && highlighted >= 0 ? id + "-" + highlighted : undefined}
          className={adding ? "pilot-field" : "pilot-field pr-10"} autoComplete="off"
          placeholder={adding ? "Enter a category name" : "Search categories"}
          maxLength={60} value={query}
          onFocus={() => !adding && setOpen(true)} onClick={() => !adding && setOpen(true)}
          onKeyDown={onKeyDown}
          onChange={event => { setQuery(event.target.value); setOpen(!adding); setActive(-1); }} />
        {!adding && <ChevronDown aria-hidden="true" size={18} className="pointer-events-none absolute right-3 top-3 text-slate-600" />}
        <div ref={popup} hidden={adding || !open}
          className={`absolute z-10 w-full overflow-hidden rounded-lg border border-border bg-white shadow-lg ${placement.above ? "bottom-full mb-1" : "top-full mt-1"}`}>
          <ul id={id + "-options"} ref={list} role="listbox" aria-label="Rating categories"
            className="relative max-h-[17.5rem] overflow-y-auto overscroll-contain"
            style={placement.listHeight === undefined ? undefined : { maxHeight: `min(17.5rem, ${placement.listHeight}px)` }}>
            {options.map((label, index) => <li key={label} role="option" id={id + "-" + index}
              aria-selected={index === highlighted} title={label}
              className={`flex h-7 cursor-pointer items-center px-3 text-sm ${index === highlighted ? "bg-primary-50" : ""}`}
              onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(label)}>
              <span className="truncate">{label}</span>
            </li>)}
          </ul>
          {!options.length && <p className="px-3 py-2 text-sm text-slate-600" role="status">
            {result.error || (!result.data ? "Searching categories…" : alreadySelected ? "Already added" : "No matching categories")}
          </p>}
          <button type="button" className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
            onClick={startAdding} onKeyDown={event => {
              if (event.key === "Escape") {
                input.current?.focus();
                setOpen(false);
                setActive(-1);
              }
            }}>
            <Plus aria-hidden="true" size={16} /> Add category
          </button>
        </div>
      </div>
      {adding && <>
        <button type="button" className="pilot-button-secondary" disabled={!canAdd}
          onClick={() => { choose(exact ?? name); input.current?.focus(); }}>Add</button>
        <button type="button" className="pilot-link px-1 text-sm" onClick={() => {
          setAdding(false); setQuery(""); input.current?.focus();
        }}>Cancel</button>
      </>}
    </div>
    {adding && alreadySelected && <p className="mt-1 text-sm text-slate-600" role="status">This category is already added.</p>}
  </div>;
}
