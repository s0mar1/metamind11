// backend/src/services/itemDatabase.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import getTFTData from './tftData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const itemsDataPath = path.join(__dirname, '..', 'data', 'tft14_items_index.json');

let itemDatabase = null;

const initializeItemDatabase = async () => {
  if (itemDatabase) {
    return itemDatabase;
  }

  console.log('통합 아이템 데이터베이스 생성을 시작합니다...');
  
  // 1. tftData.js로부터 실시간 아이템 정보를 가져옵니다.
  const tftData = await getTFTData();
  const liveItems = tftData.items;
  const liveItemMap = new Map(liveItems.map(item => [item.apiName, item]));

  // 2. 우리가 관리하는 JSON 파일을 "설계도"로 사용합니다.
  const customItemData = JSON.parse(fs.readFileSync(itemsDataPath, 'utf8'));

  const allItems = [];
  const finalCategorizedItems = {};

  // 3. "설계도"를 기준으로 최종 아이템 목록을 만듭니다.
  for (const category in customItemData) {
    if (Object.hasOwnProperty.call(customItemData, category)) {
      finalCategorizedItems[category] = [];
      for (const customItem of customItemData[category]) {
        // 4. "부품 공급처"에 해당 부품(아이템)이 있는지 확인합니다.
        const liveItem = liveItemMap.get(customItem.api_name);

        // 5. 최종 아이템 객체를 조립합니다.
        const perfectItem = {
          apiName: customItem.api_name, // 설계도의 api_name을 기준으로 삼습니다.
          name: customItem.korean_name, // 설계도의 한글 이름을 사용합니다.
          // 아이콘은 live 데이터에 있으면 그것을 쓰고(신뢰도 높음), 
          // 없으면(tftData.js의 버그) 우리 JSON의 것을 대체재로 사용합니다.
          icon: liveItem ? liveItem.icon : (customItem.icon_path || '').toLowerCase(),
          category: category,
        };
        
        allItems.push(perfectItem);
        finalCategorizedItems[category].push(perfectItem);
      }
    }
  }

  itemDatabase = {
    categorizedItems: finalCategorizedItems,
    itemMap: new Map(allItems.map(item => [item.apiName, item])),
  };
  
  console.log(`통합 아이템 데이터베이스 생성 완료! 총 ${itemDatabase.itemMap.size}개 아이템 로드.`);
  return itemDatabase;
};

const dbPromise = initializeItemDatabase();

export default dbPromise;