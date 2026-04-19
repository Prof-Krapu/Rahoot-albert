import katex from "katex"
import "katex/dist/katex.min.css"

type Segment =
  | { type: "text"; content: string }
  | { type: "inline"; content: string; raw: string }
  | { type: "block"; content: string; raw: string }

function parseLatex(text: string): Segment[] {
  const segments: Segment[] = []
  let remaining = text

  while (remaining.length > 0) {
    const blockIdx = remaining.indexOf("$$")
    const inlineIdx = remaining.indexOf("$")

    if (blockIdx !== -1 && (inlineIdx === -1 || blockIdx <= inlineIdx)) {
      if (blockIdx > 0) {
        segments.push({ type: "text", content: remaining.slice(0, blockIdx) })
      }
      const closeIdx = remaining.indexOf("$$", blockIdx + 2)
      if (closeIdx === -1) {
        segments.push({ type: "text", content: remaining.slice(blockIdx) })
        break
      }
      const formula = remaining.slice(blockIdx + 2, closeIdx)
      segments.push({ type: "block", content: formula, raw: `$$${formula}$$` })
      remaining = remaining.slice(closeIdx + 2)
    } else if (inlineIdx !== -1) {
      if (inlineIdx > 0) {
        segments.push({ type: "text", content: remaining.slice(0, inlineIdx) })
      }
      const closeIdx = remaining.indexOf("$", inlineIdx + 1)
      if (closeIdx === -1) {
        segments.push({ type: "text", content: remaining.slice(inlineIdx) })
        break
      }
      const formula = remaining.slice(inlineIdx + 1, closeIdx)
      segments.push({ type: "inline", content: formula, raw: `$${formula}$` })
      remaining = remaining.slice(closeIdx + 1)
    } else {
      segments.push({ type: "text", content: remaining })
      break
    }
  }

  return segments
}

type Props = {
  text: string
  className?: string
  block?: boolean
}

const LatexRenderer = ({ text, className, block = false }: Props) => {
  const segments = parseLatex(text)

  const rendered = segments.map((seg, i) => {
    if (seg.type === "text") {
      return <span key={i}>{seg.content}</span>
    }

    try {
      const html = katex.renderToString(seg.content, {
        throwOnError: false,
        displayMode: seg.type === "block",
      })
      return (
        <span
          key={i}
          dangerouslySetInnerHTML={{ __html: html }}
          className={seg.type === "block" ? "block my-1" : ""}
        />
      )
    } catch {
      return <span key={i}>{seg.raw}</span>
    }
  })

  return block ? (
    <div className={className}>{rendered}</div>
  ) : (
    <span className={className}>{rendered}</span>
  )
}

export default LatexRenderer
