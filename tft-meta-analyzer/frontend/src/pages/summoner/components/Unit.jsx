import React from 'react';
import Item from './Item';

const styles = {
  unit : { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 42, gap: 2 },
  unitImage : { width: 42, height: 42, borderRadius: '4px' },
  starsContainer: { display: 'flex', fontSize: '0.8rem', textShadow: '0 0 2px #fff', height: 12 },
  itemsContainer: { display: 'flex', justifyContent: 'center', gap: 2, height: 14, marginTop: 1 },
};

const costColors = { 1:'#6B7280', 2:'#16A34A', 3:'#3B82F6', 4:'#9333EA', 5:'#FBBF24' };
const getCostBorderStyle = c => ({ border: `2px solid ${costColors[c] || costColors[1]}` });
const getCostColor       = c => costColors[c] || costColors[1];

const Unit = ({ unit }) => (
  <div style={styles.unit}>
    <div style={{ ...styles.starsContainer, color: getCostColor(unit.cost) }}>{'★'.repeat(unit.tier)}</div>
    <img src={unit.image_url} alt={unit.name} style={{ ...styles.unitImage, ...getCostBorderStyle(unit.cost) }} />
    <div style={styles.itemsContainer}>{unit.items.map((it, idx) => it.image_url && <Item key={idx} item={it} />)}</div>
  </div>
);

export default Unit;