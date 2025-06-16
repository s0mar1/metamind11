import React from 'react';

const styles = {
  itemImage : { width: 14, height: 14, borderRadius: '2px' },
};

const Item = ({ item }) => (
  <img src={item.image_url} alt={item.name} style={styles.itemImage} title={item.name}/>
);

export default Item;