import React, { useEffect, useId, useRef } from 'react';
import './system.css';
export function Button({ tone = 'secondary', small, icon, block, className = '', children, type = 'button', ...props }) {
  const variant = tone === 'gold' || tone === 'primary' ? 'primary' : tone === 'danger' ? 'danger' : 'secondary';
  return <button type={type} {...props} className={`ui-button ui-${variant} ${small ? 'ui-compact' : ''} ${block ? 'ui-block' : ''} ${className}`}>{icon}{children}</button>;
}
export function PageHeader({ title, eyebrow, decoration, actions, children, className = '' }) {
  return <header className={`ui-page-header ${className}`}>
    {decoration}
    <div className="ui-page-heading">{eyebrow && <div className="ui-page-eyebrow">{eyebrow}</div>}<h1>{title}</h1></div>
    <div className="ui-header-actions">{actions}</div>
    {children}
  </header>;
}
export function Field({ label, hint, error, children, as: Tag = 'label', className = '' }) {
  const id = useId();
  const controls = React.Children.map(children, child => {
    if (!React.isValidElement(child) || !['input','select','textarea'].includes(child.type)) return child;
    return React.cloneElement(child, { className: `ui-input ${child.props.className || ''}`, 'aria-invalid': error ? true : child.props['aria-invalid'],
      'aria-describedby': [child.props['aria-describedby'], hint || error ? id : null].filter(Boolean).join(' ') || undefined });
  });
  return <Tag className={`ui-field ${className}`}><span className="ui-field-label">{label}</span>{controls}{(error || hint) && <span id={id} className={error ? 'ui-field-error' : 'ui-field-hint'} role={error ? 'alert' : undefined}>{error || hint}</span>}</Tag>;
}
export function AccountSelector({ accounts, value, onChange, label = 'Account', allLabel = 'All accounts', allValue = '*', allowAll = false, manageLabel = 'Manage accounts', onManage }) {
  const ref = useRef(null);
  const selected = accounts.find(a => a.id === value);
  const name = accounts.length <= 1 ? accounts[0]?.name || label : allowAll && value === allValue ? allLabel : selected?.name || accounts[0]?.name || label;
  useEffect(() => {
    const close = e => { if (ref.current?.open && !ref.current.contains(e.target)) ref.current.open = false; };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  if (accounts.length <= 1) return <div className="ui-account-single" aria-label={label}>{name}</div>;
  function choose(id) { onChange(id); ref.current.open = false; ref.current.querySelector('summary')?.focus({ preventScroll: true }); }
  return <details ref={ref} className="ui-account-selector" onKeyDown={e => { if (e.key === 'Escape') { ref.current.open = false; ref.current.querySelector('summary')?.focus(); } }}>
    <summary aria-label={`${label}: ${name}`}><span>{name}</span><span aria-hidden="true">⌄</span></summary>
    <div className="ui-account-menu" role="group" aria-label={label}>
      {allowAll && <button type="button" aria-pressed={value === allValue} onClick={() => choose(allValue)}><span>{allLabel}</span><span aria-hidden="true">{value === allValue ? '✓' : ''}</span></button>}
      {accounts.map(a => <button type="button" key={a.id} aria-pressed={a.id === (selected?.id || (value === allValue ? null : accounts[0]?.id))} onClick={() => choose(a.id)}><span>{a.name}</span><span aria-hidden="true">{a.id === selected?.id ? '✓' : ''}</span></button>)}
      {onManage && <Button className="ui-block" onClick={() => { ref.current.open = false; onManage(); }}>{manageLabel}</Button>}
    </div>
  </details>;
}

export function Chevron({ expanded = true }) {
  return <svg className="ui-chevron" data-open={expanded} viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
