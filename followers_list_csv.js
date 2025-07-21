// 粉丝列表获取脚本（带CSV导出）
(function() {
    const USER_ID = '53216295191'; // 替换为目标用户ID
    const API_URL = 'https://www.instagram.com/graphql/query/?';
    const QUERY_HASH = 'c76146de99bb02f6415203be841dd25a';
    
    let resultArray = [];
    let pageCount = 0;
    
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
    
    async function getFollowersList(cursor = '') {
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
            
            if (data.data?.user?.edge_followed_by?.edges) {
                const users = data.data.user.edge_followed_by.edges;
                
                users.forEach(user => {
                    resultArray.push(
                        `${user.node.username} / ${user.node.full_name} / ${user.node.id}`
                    );
                });
                
                console.log(`第 ${pageCount + 1} 页完成，获取 ${users.length} 个用户`);
                pageCount++;
                
                const pageInfo = data.data.user.edge_followed_by.page_info;
                if (pageInfo.has_next_page && pageCount < 10) {
                    await delay(1000);
                    await getFollowersList(pageInfo.end_cursor);
                } else {
                    console.log('\n=== 获取完成 ===');
                    console.log(`总共获取 ${resultArray.length} 个粉丝用户`);
                    console.log('\n粉丝列表：');
                    console.log(resultArray.join('\n'));
                    
                    // 自动下载CSV文件
                    const currentTime = new Date().toISOString().slice(0,19).replace(/:/g,'-');
                    const filename = `instagram_followers_${USER_ID}_${currentTime}.csv`;
                    downloadCSV(resultArray, filename);
                }
            } else {
                console.error('数据格式错误:', data);
            }
        } catch (error) {
            console.error('请求失败:', error);
            
            if (resultArray.length > 0) {
                console.log('\n⚠️ 虽然出现错误，但已保存获取到的数据');
                const currentTime = new Date().toISOString().slice(0,19).replace(/:/g,'-');
                const filename = `instagram_followers_${USER_ID}_partial_${currentTime}.csv`;
                downloadCSV(resultArray, filename);
            }
        }
    }
    
    console.log(`开始获取用户 ${USER_ID} 的粉丝列表...`);
    getFollowersList();
})(); 