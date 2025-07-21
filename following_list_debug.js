(function() {
    const USER_ID = '28187726'; // 替换为目标用户ID
    const API_URL = 'https://www.instagram.com/graphql/query/?';
    const QUERY_HASH = 'd04b0a864b4b54837c0d870b0e77e076';
    
    let resultArray = [];
    let pageCount = 0;
    let startTime = new Date();
    let debugInfo = [];
    
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // CSV导出功能
    function downloadCSV(data, filename) {
        const csvHeader = 'Username,Full Name,User ID\n';
        const csvContent = data.map(item => {
            const [username, fullName, userId] = item.split(' / ');
            const escapedFullName = fullName.includes(',') ? `"${fullName}"` : fullName;
            return `${username},${escapedFullName},${userId}`;
        }).join('\n');
        
        const csvData = csvHeader + csvContent;
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`✅ CSV文件已下载: ${filename}`);
    }
    
    // 下载调试日志
    function downloadDebugLog() {
        const logContent = debugInfo.join('\n');
        const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8;' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const currentTime = new Date().toISOString().slice(0,19).replace(/:/g,'-');
        link.setAttribute('href', url);
        link.setAttribute('download', `debug_log_${USER_ID}_${currentTime}.txt`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('📝 调试日志已下载');
    }
    
    async function getFollowingList(cursor = '') {
        const params = {
            "id": USER_ID,
            "include_reel": true,
            "fetch_mutual": false,
            "first": 100
        };
        
        if (cursor) params.after = cursor;
        
        const queryParams = encodeURIComponent(JSON.stringify(params));
        const requestUrl = API_URL + 'query_hash=' + QUERY_HASH + '&variables=' + queryParams;
        
        // 记录调试信息
        const debugEntry = `
=== 第 ${pageCount + 1} 页请求 ===
时间: ${new Date().toISOString()}
Cursor: ${cursor || 'null'}
请求URL: ${requestUrl}`;
        debugInfo.push(debugEntry);
        
        try {
            console.log(`🔄 获取第 ${pageCount + 1} 页数据... (已获取: ${resultArray.length})`);
            
            const response = await fetch(requestUrl);
            const data = await response.json();
            
            // 详细记录响应信息
            const responseInfo = `
响应状态: ${response.status}
响应大小: ${JSON.stringify(data).length} 字符
数据结构存在: {
  data: ${!!data.data}
  user: ${!!data.data?.user}
  edge_follow: ${!!data.data?.user?.edge_follow}
  edges: ${!!data.data?.user?.edge_follow?.edges}
  page_info: ${!!data.data?.user?.edge_follow?.page_info}
}`;
            debugInfo.push(responseInfo);
            
            if (data.data?.user?.edge_follow?.edges) {
                const users = data.data.user.edge_follow.edges;
                const pageInfo = data.data.user.edge_follow.page_info;
                
                // 记录页面信息
                const pageDetails = `
本页用户数: ${users.length}
has_next_page: ${pageInfo.has_next_page}
end_cursor: ${pageInfo.end_cursor || 'null'}`;
                debugInfo.push(pageDetails);
                
                users.forEach(user => {
                    resultArray.push(
                        `${user.node.username} / ${user.node.full_name} / ${user.node.id}`
                    );
                });
                
                console.log(`✅ 第 ${pageCount + 1} 页完成: ${users.length} 个用户 (总计: ${resultArray.length})`);
                console.log(`📊 页面信息: has_next_page=${pageInfo.has_next_page}, cursor=${pageInfo.end_cursor ? '有' : '无'}`);
                
                pageCount++;
                
                // 检查是否继续
                if (pageInfo.has_next_page && pageInfo.end_cursor && pageCount < 20) { // 增加页数限制到20
                    console.log(`⏳ 等待1秒后获取下一页...`);
                    await delay(1000);
                    await getFollowingList(pageInfo.end_cursor);
                } else {
                    // 记录停止原因
                    let stopReason = '';
                    if (!pageInfo.has_next_page) stopReason = '没有更多页面';
                    else if (!pageInfo.end_cursor) stopReason = '没有cursor';
                    else if (pageCount >= 20) stopReason = '达到最大页数限制(20页)';
                    
                    debugInfo.push(`\n停止原因: ${stopReason}`);
                    
                    const endTime = new Date();
                    const duration = Math.round((endTime - startTime) / 1000);
                    
                    console.log('\n🎉 === 获取完成 ===');
                    console.log(`📊 统计信息:`);
                    console.log(`- 总获取用户: ${resultArray.length}`);
                    console.log(`- 总页数: ${pageCount}`);
                    console.log(`- 用时: ${duration} 秒`);
                    console.log(`- 停止原因: ${stopReason}`);
                    console.log(`- 平均每页: ${Math.round(resultArray.length / pageCount)} 用户`);
                    
                    // 下载数据和调试日志
                    const currentTime = new Date().toISOString().slice(0,19).replace(/:/g,'-');
                    const filename = `instagram_following_${USER_ID}_${currentTime}.csv`;
                    downloadCSV(resultArray, filename);
                    downloadDebugLog();
                    
                    console.log('\n💡 如果数据不完整，请查看下载的调试日志文件');
                }
            } else {
                const errorMsg = `❌ 数据格式异常! 响应: ${JSON.stringify(data, null, 2)}`;
                console.error(errorMsg);
                debugInfo.push(errorMsg);
                
                // 保存已获取的数据
                if (resultArray.length > 0) {
                    console.log(`💾 保存已获取的 ${resultArray.length} 个用户`);
                    const currentTime = new Date().toISOString().slice(0,19).replace(/:/g,'-');
                    const filename = `instagram_following_${USER_ID}_error_${currentTime}.csv`;
                    downloadCSV(resultArray, filename);
                    downloadDebugLog();
                }
            }
        } catch (error) {
            const errorMsg = `❌ 请求失败: ${error.message}\n堆栈: ${error.stack}`;
            console.error(errorMsg);
            debugInfo.push(errorMsg);
            
            // 保存已获取的数据
            if (resultArray.length > 0) {
                console.log(`💾 发生错误，但已保存 ${resultArray.length} 个用户`);
                const currentTime = new Date().toISOString().slice(0,19).replace(/:/g,'-');
                const filename = `instagram_following_${USER_ID}_error_${currentTime}.csv`;
                downloadCSV(resultArray, filename);
                downloadDebugLog();
            }
        }
    }
    
    // 开始执行
    console.log(`🚀 开始获取用户 ${USER_ID} 的关注列表...`);
    console.log('🔍 调试模式已启用，将生成详细日志');
    console.log('📄 最多获取20页 (约2000用户)');
    
    debugInfo.push(`开始时间: ${startTime.toISOString()}`);
    debugInfo.push(`用户ID: ${USER_ID}`);
    debugInfo.push(`Query Hash: ${QUERY_HASH}`);
    
    getFollowingList();
})(); 