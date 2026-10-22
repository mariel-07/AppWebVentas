
interface EmptyProps {
  text: string
}

export default function Empty({ text }: EmptyProps) {
  return <div className="empty">{text}</div>
}
