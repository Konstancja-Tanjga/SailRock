/** Najważniejsze liczby wyniku: krótka etykieta i duża wartość. */
export function Stats({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="sr-stats">
      {items.map((item) => (
        <div className="sr-stat" key={item.label}>
          <dt>{item.label}</dt>
          <dd className="sr-figure">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
