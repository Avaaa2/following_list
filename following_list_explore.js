// 探索版本 - 寻找关注时间信息
(function() {
    const USER_ID = '53216295191'; // 替换为目标用户ID
    const API_URL = 'https://www.instagram.com/graphql/query/?';
    const QUERY_HASH = 'd04b0a864b4b54837c0d870b0e77e076';
    
    let resultArray = [];
    let rawDataSamples = [];
    let pageCount = 0;
    
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 深度分析单个用户节点的所有字段
    function analyzeUserNode(userNode, index) {
        console.log(`\n🔍 === 用户 ${index + 1} 完整数据结构 ===`);
        console.log('原始数据:', JSON.stringify(userNode, null, 2));
        
        // 寻找可能的时间戳字段
        const timeFields = [];
        function findTimeFields(obj, path = '') {
            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;
                
                if (key.toLowerCase().includes('time') || 
                    key.toLowerCase().includes('date') || 
                    key.toLowerCase().includes('timestamp') ||
                    key.toLowerCase().includes('created') ||
                    key.toLowerCase().includes('follow')) {
                    timeFields.push({ path: currentPath, key, value });
                }
                
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    findTimeFields(value, currentPath);
                }
            }
        }
        
        findTimeFields(userNode);
        
        if (timeFields.length > 0) {
            console.log('🕐 发现可能的时间相关字段:');
            timeFields.forEach(field => {
                console.log(`- ${field.path}: ${field.value}`);
            });
        } else {
            console.log('❌ 未发现明显的时间字段');
        }
        
        // 检查数字字段（可能是时间戳）
        const numberFields = [];
        function findNumberFields(obj, path = '') {
            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;
                
                if (typeof value === 'number') {
                    // 检查是否可能是时间戳（合理的范围）
                    const isTimestamp = value > 1000000000 && value < 9999999999;
                    const isTimestampMs = value > 1000000000000 && value < 9999999999999;
                    
                    if (isTimestamp || isTimestampMs) {
                        const date = new Date(isTimestampMs ? value : value * 1000);
                        numberFields.push({ 
                            path: currentPath, 
                            value, 
                            possibleDate: date.toISOString(),
                            type: isTimestampMs ? 'milliseconds' : 'seconds'
                        });
                    }
                }
                
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    findNumberFields(value, currentPath);
                }
            }
        }
        
        findNumberFields(userNode);
        
        if (numberFields.length > 0) {
            console.log('🔢 发现可能的时间戳数字:');
            numberFields.forEach(field => {
                console.log(`- ${field.path}: ${field.value} (${field.type}) → ${field.possibleDate}`);
            });
        }
        
        return { timeFields, numberFields };
    }
    
    // 分析edge结构
    function analyzeEdgeStructure(edge, index) {
        console.log(`\n📊 === Edge ${index + 1} 完整结构 ===`);
        console.log('Edge数据:', JSON.stringify(edge, null, 2));
        
        // edge本身可能包含时间信息
        const edgeTimeFields = [];
        for (const [key, value] of Object.entries(edge)) {
            if (key !== 'node') { // node我们单独分析
                console.log(`Edge属性 ${key}:`, value);
                
                if (typeof value === 'number' && (
                    (value > 1000000000 && value < 9999999999) ||
                    (value > 1000000000000 && value < 9999999999999)
                )) {
                    const isMs = value > 1000000000000;
                    const date = new Date(isMs ? value : value * 1000);
                    edgeTimeFields.push({
                        key,
                        value,
                        possibleDate: date.toISOString()
                    });
                }
            }
        }
        
        if (edgeTimeFields.length > 0) {
            console.log('🕐 Edge中的可能时间戳:');
            edgeTimeFields.forEach(field => {
                console.log(`- ${field.key}: ${field.value} → ${field.possibleDate}`);
            });
        }
        
        return edgeTimeFields;
    }
    
    async function getFollowingList(cursor = '') {
        if (pageCount >= 2) { // 只获取前2页进行详细分析
            console.log('🛑 分析模式：只获取前2页数据进行详细分析');
            
            // 生成分析报告
            console.log('\n📋 === 分析报告 ===');
            console.log(`总分析用户数: ${rawDataSamples.length}`);
            
            if (rawDataSamples.length > 0) {
                console.log('\n💡 建议查看上面的详细日志，寻找以下模式:');
                console.log('1. 包含"time"、"date"、"timestamp"的字段名');
                console.log('2. 大数字值（可能是时间戳）');
                console.log('3. Edge级别的额外属性');
            }
            
            return;
        }
        
        const params = {
            "id": USER_ID,
            "include_reel": true,
            "fetch_mutual": false,
            "first": 5 // 每页只取5个用户进行详细分析
        };
        
        if (cursor) params.after = cursor;
        
        const queryParams = encodeURIComponent(JSON.stringify(params));
        const requestUrl = API_URL + 'query_hash=' + QUERY_HASH + '&variables=' + queryParams;
        
        try {
            console.log(`\n🔄 分析第 ${pageCount + 1} 页数据...`);
            
            const response = await fetch(requestUrl);
            const data = await response.json();
            
            if (data.data?.user?.edge_follow?.edges) {
                const edges = data.data.user.edge_follow.edges;
                
                console.log(`\n📦 第 ${pageCount + 1} 页原始响应结构:`);
                console.log('Page Info:', JSON.stringify(data.data.user.edge_follow.page_info, null, 2));
                
                edges.forEach((edge, index) => {
                    const globalIndex = pageCount * 5 + index;
                    
                    // 分析edge结构
                    const edgeAnalysis = analyzeEdgeStructure(edge, globalIndex);
                    
                    // 分析用户节点
                    const userAnalysis = analyzeUserNode(edge.node, globalIndex);
                    
                    rawDataSamples.push({
                        index: globalIndex,
                        edge: edge,
                        userAnalysis,
                        edgeAnalysis
                    });
                    
                    // 添加到结果数组
                    resultArray.push({
                        username: edge.node.username,
                        full_name: edge.node.full_name,
                        id: edge.node.id,
                        position: globalIndex + 1
                    });
                    
                    // 添加分隔线
                    console.log('\n' + '='.repeat(50));
                });
                
                pageCount++;
                
                const pageInfo = data.data.user.edge_follow.page_info;
                if (pageInfo.has_next_page && pageInfo.end_cursor) {
                    await delay(2000); // 2秒延迟
                    await getFollowingList(pageInfo.end_cursor);
                }
            } else {
                console.error('❌ 数据格式异常:', data);
            }
        } catch (error) {
            console.error('❌ 请求失败:', error);
        }
    }
    
    console.log('🔍 启动深度分析模式...');
    console.log('📊 将详细分析Instagram API响应中的所有字段');
    console.log('🕐 重点寻找可能的关注时间信息');
    console.log('⚠️  注意：这会产生大量日志输出');
    
    getFollowingList();
})(); 