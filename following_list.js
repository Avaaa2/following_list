// 防冲突版本 - 直接复制到控制台运行
(function() {
    const USER_ID = '28187726'; // 替换为目标用户ID
    const API_URL = 'https://www.instagram.com/graphql/query/?';
    const QUERY_HASH = 'd04b0a864b4b54837c0d870b0e77e076';
    
    let resultArray = [];
    let pageCount = 0;
    
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // CSV导出功能
    function downloadCSV(data, filename) {
        // 创建CSV内容
        const csvHeader = 'Username,Full Name,User ID\n';
        const csvContent = data.map(item => {
            const [username, fullName, userId] = item.split(' / ');
            // 处理包含逗号的字段，用双引号包围
            const escapedFullName = fullName.includes(',') ? `"${fullName}"` : fullName;
            return `${username},${escapedFullName},${userId}`;
        }).join('\n');
        
        const csvData = csvHeader + csvContent;
        
        // 创建Blob对象
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        
        // 创建下载链接
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        // 添加到页面并触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`✅ CSV文件已下载: ${filename}`);
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
        
        try {
            console.log(`获取第 ${pageCount + 1} 页数据...`);
            
            const response = await fetch(requestUrl);
            const data = await response.json();
            
            if (data.data?.user?.edge_follow?.edges) {
                const users = data.data.user.edge_follow.edges;
                
                users.forEach(user => {
                    resultArray.push(
                        `${user.node.username} / ${user.node.full_name} / ${user.node.id}`
                    );
                });
                
                console.log(`第 ${pageCount + 1} 页完成，获取 ${users.length} 个用户`);
                pageCount++;
                
                const pageInfo = data.data.user.edge_follow.page_info;
                if (pageInfo.has_next_page && pageCount < 10) {
                    await delay(1000); // 1秒延迟
                    await getFollowingList(pageInfo.end_cursor);
                } else {
                    console.log('\n=== 获取完成 ===');
                    console.log(`总共获取 ${resultArray.length} 个关注用户`);
                    console.log('\n关注列表：');
                    console.log(resultArray.join('\n'));
                    
                    // 自动下载CSV文件
                    const currentTime = new Date().toISOString().slice(0,19).replace(/:/g,'-');
                    const filename = `instagram_following_${USER_ID}_${currentTime}.csv`;
                    downloadCSV(resultArray, filename);
                }
            } else {
                console.error('数据格式错误:', data);
            }
        } catch (error) {
            console.error('请求失败:', error);
            
            // 即使出错，也保存已获取的数据
            if (resultArray.length > 0) {
                console.log('\n⚠️ 虽然出现错误，但已保存获取到的数据');
                const currentTime = new Date().toISOString().slice(0,19).replace(/:/g,'-');
                const filename = `instagram_following_${USER_ID}_partial_${currentTime}.csv`;
                downloadCSV(resultArray, filename);
            }
        }
    }
    
    // 开始执行
    console.log(`开始获取用户 ${USER_ID} 的关注列表...`);
    getFollowingList();
})();