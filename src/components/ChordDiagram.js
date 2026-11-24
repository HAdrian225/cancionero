import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

export function ChordDiagram({ v, ns, c }) {
  const W = 146;
  const L = 30;
  const T = 30;
  const gw = (W - 2 * L) / (ns - 1);
  const fh = 21;
  const x = (i) => L + i * gw;

  return (
    <Svg width={W} height={T + 5 * fh + 10}>
      {Array.from({ length: 6 }, (_, j) => (
        <Line
          key={'h' + j}
          x1={L}
          x2={W - L}
          y1={T + j * fh}
          y2={T + j * fh}
          stroke={j === 0 && v.base === 1 ? c.fg : c.line}
          strokeWidth={j === 0 && v.base === 1 ? 4 : 1.2}
        />
      ))}
      {Array.from({ length: ns }, (_, i) => (
        <Line
          key={'s' + i}
          x1={x(i)}
          x2={x(i)}
          y1={T}
          y2={T + 5 * fh}
          stroke={c.sub}
          strokeWidth={1.1}
        />
      ))}
      {v.frets.map((f, i) =>
        f < 0 ? (
          <SvgText key={i} x={x(i)} y={T - 9} fontSize={13} fontWeight="600" fill={c.sub} textAnchor="middle">
            ×
          </SvgText>
        ) : f === 0 ? (
          <Circle key={i} cx={x(i)} cy={T - 13} r={4.5} stroke={c.sub} strokeWidth={1.6} fill="none" />
        ) : (
          <Circle key={i} cx={x(i)} cy={T + (f - v.base + 0.5) * fh} r={7.5} fill={c.accent} />
        )
      )}
      {v.base > 1 ? (
        <SvgText x={L - 10} y={T + fh * 0.72} fontSize={11} fontWeight="600" fill={c.sub} textAnchor="end">
          {v.base}fr
        </SvgText>
      ) : null}
    </Svg>
  );
}
