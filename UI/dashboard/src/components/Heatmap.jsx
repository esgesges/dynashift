import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useStore } from '../store/useStore'

const MARGIN = { top: 8, right: 14, bottom: 28, left: 34 }
const LEGEND_H = 28

export default function Heatmap() {
  const svgRef   = useRef(null)
  const wrapRef  = useRef(null)
  const points   = useStore(s => s.heatPoints)

  const draw = () => {
    const wrap = wrapRef.current
    if (!wrap || !svgRef.current) return
    const W = wrap.clientWidth  || 300
    const H = wrap.clientHeight || 200

    const svg = d3.select(svgRef.current)
    svg.attr('width', W).attr('height', H)
    svg.selectAll('*').remove()

    const chartH = H - LEGEND_H
    const iw = W - MARGIN.left - MARGIN.right
    const ih = chartH - MARGIN.top - MARGIN.bottom
    if (iw < 10 || ih < 10) return

    const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    const xScale = d3.scaleLinear().domain([0, 250]).range([0, iw])
    const yScale = d3.scaleLinear().domain([-0.6, 0.6]).range([ih, 0])
    const color  = d3.scaleSequential(d3.interpolateInferno).domain([0, 10])

    g.append('g').attr('transform', `translate(0,${ih})`)
      .call(d3.axisBottom(xScale).ticks(5).tickSize(3))
      .call(ax => { ax.select('.domain').attr('stroke','#333'); ax.selectAll('text').attr('fill','#555').attr('font-size',9); ax.selectAll('line').attr('stroke','#333') })

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(4).tickSize(3))
      .call(ax => { ax.select('.domain').attr('stroke','#333'); ax.selectAll('text').attr('fill','#555').attr('font-size',9); ax.selectAll('line').attr('stroke','#333') })

    svg.append('text').attr('x', MARGIN.left + iw / 2).attr('y', chartH - 4)
      .attr('text-anchor','middle').attr('fill','#444').attr('font-size',9).text('Velocità (km/h)')
    svg.append('text').attr('transform','rotate(-90)')
      .attr('x', -(MARGIN.top + ih / 2)).attr('y', 10)
      .attr('text-anchor','middle').attr('fill','#444').attr('font-size',9).text('Angolo medio')

    if (points.length >= 3) {
      const bx = 15, by = 0.08
      const bins = new Map()
      for (const p of points) {
        const kx = Math.round(p.speed / bx) * bx
        const ky = Math.round(p.angle / by) * by
        const k  = `${kx},${ky}`
        bins.set(k, (bins.get(k) ?? 0) + 1)
      }
      const cellW = Math.max(1, xScale(bx) - xScale(0))
      const cellH = Math.max(1, yScale(0)  - yScale(by))
      for (const [k, cnt] of bins) {
        const [kx, ky] = k.split(',').map(Number)
        const cx = xScale(kx), cy = yScale(ky)
        if (cx < 0 || cx > iw || cy < 0 || cy > ih) continue
        g.append('rect')
          .attr('x', cx - cellW / 2).attr('y', cy - cellH / 2)
          .attr('width', cellW).attr('height', cellH)
          .attr('fill', color(Math.min(cnt, 10))).attr('opacity', 0.92)
      }
    }

    /* ── legenda orizzontale ── */
    const legY  = chartH + 2
    const legX  = MARGIN.left
    const legW  = iw
    const legBarH = 9

    const defs = svg.append('defs')
    const grad = defs.append('linearGradient').attr('id','heatLegGrad')
    const stops = d3.range(0, 1.01, 0.1)
    stops.forEach(t => grad.append('stop').attr('offset', `${t*100}%`).attr('stop-color', color(t * 10)))

    svg.append('rect')
      .attr('x', legX).attr('y', legY)
      .attr('width', legW).attr('height', legBarH)
      .attr('fill', 'url(#heatLegGrad)').attr('rx', 3)

    svg.append('text').attr('x', legX).attr('y', legY + legBarH + 9)
      .attr('fill','#555').attr('font-size',8).attr('text-anchor','start').text('Bassa densità')
    svg.append('text').attr('x', legX + legW).attr('y', legY + legBarH + 9)
      .attr('fill','#555').attr('font-size',8).attr('text-anchor','end').text('Alta densità')
  }

  useEffect(() => { draw() }, [points])

  useEffect(() => {
    const ro = new ResizeObserver(() => draw())
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [points])

  return (
    <div className="panel-card" style={{ padding: '8px 10px' }}>
      <h3>Heatmap Velocità–Angolo</h3>
      <div ref={wrapRef} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}
