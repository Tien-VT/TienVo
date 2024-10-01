var dataLocations = [];

// Các phần tử và trường nhập liệu
var submitAStar = document.querySelector('.aStarSearch');
var submitBranchAndBound = document.querySelector('.branchAndBound');
var start = document.getElementById('start');
var end = document.getElementById('end');

// Kiểm tra xem nút tìm kiếm và nút 2 thuật toán
if (!submitAStar) {
    console.error('Nút A* không tồn tại trong DOM.');
}
if (!submitBranchAndBound) {
    console.error('Nút Nhánh và Cận không tồn tại trong DOM.');
}

// Lấy dữ liệu ở  data.json
fetch('./data.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Phản hồi mạng không ổn.');
        }
        return response.json();
    })
    .then(data => {
        console.log('Data loaded:', data); // Ghi log dữ liệu đã tải
        dataLocations = data.locations;

        // Tạo điểm cho các vị trí trên bản đồ
        dataLocations.forEach(location => {
            const { cx, cy } = convertGPSToPixel(location.lat, location.long);

            var point = document.createElement('div');
            point.className = 'point';
            point.style.left = `${cx}px`;
            point.style.top = `${cy}px`;

            var label = document.createElement('span');
            label.className = 'label2';
            label.innerText = location.name;

            point.appendChild(label);
            document.querySelector('.inner').appendChild(point);
        });
    })
    .catch(error => console.error('Lỗi khi lấy tệp JSON:', error));

//Thuật Toán A*(ASTARSEARCH)
function aStarSearch(startValue, endValue) {
    let startLocation = dataLocations.find(loc => loc.name === startValue);
    let endLocation = dataLocations.find(loc => loc.name === endValue);

    if (!startLocation || !endLocation) {
        console.log("START and END không tồn tại!");
        return [];
    }

    let openList = [startLocation];
    let closedList = new Set();
    let cameFrom = {};
    let gScore = {};
    let fScore = {};

    gScore[startLocation.id] = 0;
    fScore[startLocation.id] = heuristic(startLocation, endLocation);

    while (openList.length > 0) {
        openList.sort((a, b) => fScore[a.id] - fScore[b.id]);
        let currentNode = openList.shift();

        if (currentNode.name === endValue) {
            console.log("Thành công! Đã tìm thấy vị trí kết thúc:", currentNode.name);
            return reconstructPath(cameFrom, startLocation, currentNode);
        }

        closedList.add(currentNode.id);

        for (let neighborId of currentNode.near) {
            let neighbor = dataLocations.find(loc => loc.id === neighborId);
            if (closedList.has(neighbor.id)) continue;

            let tentativeGScore = (gScore[currentNode.id] || Infinity) + 1;

            if (!openList.includes(neighbor)) {
                openList.push(neighbor);
            } else if (tentativeGScore >= (gScore[neighbor.id] || Infinity)) {
                continue;
            }

            cameFrom[neighbor.id] = currentNode;
            gScore[neighbor.id] = tentativeGScore;
            fScore[neighbor.id] = gScore[neighbor.id] + heuristic(neighbor, endLocation);
        }
    }
    console.log("Không tìm thấy vị trí!");
    return [];
}

// Thuật Toán Nhánh Cận (BRANCHANDBOUND)
function branchAndBound(startValue, endValue) {
    let startLocation = dataLocations.find(loc => loc.name === startValue);
    let endLocation = dataLocations.find(loc => loc.name === endValue);

    if (!startLocation || !endLocation) {
        console.log("Không tìm thấy vị trí bắt đầu hoặc kết thúc!");
        return [];
    }

    let bestPath = [];
    let bestCost = Infinity;

    function search(currentLocation, path, cost) {
        path.push(currentLocation);

        // Nếu đã đến đích
        if (currentLocation.name === endValue) {
            if (cost < bestCost) {
                bestCost = cost;
                bestPath = [...path];
            }
        } else {
            for (let neighborId of currentLocation.near) {
                let neighbor = dataLocations.find(loc => loc.id === neighborId);
                if (!path.includes(neighbor)) {
                    // Ước tính chi phí từ vị trí lân cận đến đích
                    let estimatedCost = cost + 1 + heuristic(neighbor, endLocation);
                    // Nếu chi phí ước tính nhỏ hơn chi phí tốt nhất
                    if (estimatedCost < bestCost) {
                        search(neighbor, path, cost + 1);
                    }
                }
            }
        }

        path.pop();
    }

    search(startLocation, [], 0);
    return bestPath;
}

// Tính toán khoảng cách giữa hai điểm
function heuristic(locationA, locationB) {
    let dx = locationA.lat - locationB.lat;
    let dy = locationA.long - locationB.long;
    return Math.sqrt(dx * dx + dy * dy);
}

// Tái tạo đường đi
function reconstructPath(cameFrom, start, goal) {
    let path = [goal];
    let current = goal;
    while (current.id !== start.id) {
        current = cameFrom[current.id];
        path.push(current);
    }
    return path.reverse();
}

// Tính tổng khoảng cách giữa các vị trí
function calculateTotalDistance(locations) {
    let totalDistance = 0;

    for (let i = 0; i < locations.length - 1; i++) {
        const locationA = locations[i];
        const locationB = locations[i + 1];

        // Sử dụng hàm heuristic để tính khoảng cách
        const distance = heuristic(locationA, locationB);
        totalDistance += distance;
    }

    return totalDistance;
}

// Kích thước bản đồ
const svgWidth = 500;
const svgHeight = 500;
const topLeft = { lat: 24.2, long: 97.34 };
const bottomRight = { lat: 7.812, long: 114.39 };

// Chuyển đổi tọa độ GPS sang tọa độ pixel
function convertGPSToPixel(lat, long) {
    const latRange = topLeft.lat - bottomRight.lat;
    const longRange = bottomRight.long - topLeft.long;

    const cx = ((long - topLeft.long) / longRange) * svgWidth;
    const cy = ((topLeft.lat - lat) / latRange) * svgHeight;

    return { cx, cy };
}

// Vẽ đường giữa các điểm đánh dấu với độ trễ và cập nhật kết quả hiển thị
function drawLinesBetweenMarkers(locations) {
    const svgElement = document.getElementById('lines');
    const resultElement = document.querySelector('.submit');

    // Xóa các đường cũ
    while (svgElement.firstChild) {
        svgElement.removeChild(svgElement.firstChild);
    }

    // Xóa nội dung kết quả cũ
    resultElement.innerHTML = '<h1 style="font-size: 15px;">Kết quả đường đi</h1>';

    // Khởi tạo chuỗi đường đi
    let pathString = locations[0].name; // Bắt đầu với tên vị trí đầu tiên

    let i = 0;
    function drawNextLine() {
        if (i >= locations.length - 1) return;

        const start = convertGPSToPixel(locations[i].lat, locations[i].long);
        const end = convertGPSToPixel(locations[i + 1].lat, locations[i + 1].long);

        // Tạo phần tử đường kẻ
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", start.cx);
        line.setAttribute("y1", start.cy);
        line.setAttribute("x2", end.cx);
        line.setAttribute("y2", end.cy);
        line.setAttribute("class", "line");

        svgElement.appendChild(line);

        // Cập nhật chuỗi đường đi với vị trí tiếp theo
        const nextLocation = locations[i + 1];
        pathString += ` → ${nextLocation.name}`; // Add next location's name to string

        // Hiển thị chuỗi đường đi đã cập nhật
        resultElement.innerHTML = `<h1 style="font-size: 15px;">Kết quả đường đi</h1><p>${pathString}</p>`;

        i++;
        // Chờ 1 giây trước khi vẽ đường tiếp theo
        setTimeout(drawNextLine, 1000);
    }

    // Bắt đầu vẽ đường đầu tiên
    drawNextLine();
}

// Sự kiện cho các nút
if (submitAStar) {
    submitAStar.addEventListener('click', function () {
        console.log('Nút A* được nhấn');
        // Ẩn nút Nhánh Cận
        submitBranchAndBound.style.display = 'none';//Ẩn Thuật Toán Nhánh Cận khi chọn tìm kiếm A*

        var startValue = start.value;
        var endValue = end.value;
        // Ẩn kết quả Nhánh và Cận
        var branchResult = document.querySelector('.branch-result');
        if (branchResult) {
            branchResult.style.display = 'none';
        }

        var dataResponse = aStarSearch(startValue, endValue);
        handleResponse(dataResponse, 'AStar'); // Pass algorithm type
    });
}

if (submitBranchAndBound) {
    submitBranchAndBound.addEventListener('click', function () {
        console.log('Nút Nhánh và Cận được nhấn!');
        // Ẩn nút A*
        submitAStar.style.display = 'none'; // Ẩn Thuật Toán A* khi chọn tìm kiếm Nhánh Cận

        var startValue = start.value;
        var endValue = end.value;

        // Ẩn kết quả của A*
        var aStarResult = document.querySelector('.a-star-result');
        if (aStarResult) {
            aStarResult.style.display = 'none';
        }

        var dataResponse = branchAndBound(startValue, endValue);
        handleResponse(dataResponse, 'BranchAndBound'); // Truyền loại thuật toán
    });
}

// Xử lý phản hồi và hiển thị kết quả
// Hàm tính khoảng cách giữa 2 tọa độ GPS sử dụng công thức Haversine
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Bán kính trái đất tính bằng km
    const toRad = angle => (angle * Math.PI) / 180; // Hàm chuyển đổi từ độ sang radian

    const dLat = toRad(lat2 - lat1); // Chênh lệch vĩ độ
    const dLon = toRad(lon2 - lon1); // Chênh lệch kinh độ

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Khoảng cách tính bằng km
}

// Hàm tính tổng khoảng cách giữa các điểm
function calculateTotalDistance(dataResponse) {
    let totalDistance = 0;

    for (let i = 0; i < dataResponse.length - 1; i++) {
        const loc1 = dataResponse[i];
        const loc2 = dataResponse[i + 1];
        totalDistance += haversineDistance(loc1.lat, loc1.long, loc2.lat, loc2.long);
    }

    return totalDistance; // Tổng khoảng cách tính bằng km
}

function handleResponse(dataResponse, algorithmType) {
    var resElement = document.querySelector(".show-response");
    var totalDistanceElement = document.querySelector(".all-km");

    if (dataResponse.length === 0) {
        resElement.innerText = "Không tìm thấy vị trí nào!";
        totalDistanceElement.innerText = "Tổng quảng đường di chuyển: 0 km";
        return;
    }

    let path = dataResponse.map(value => value.name).join(" ⇢ ");

    document.querySelectorAll('.inner .point2').forEach(point => point.remove());

    // Hiển thị từng điểm với độ trễ
    let i = 0;
    function showNextPoint() {
        if (i >= dataResponse.length) {
            // Khi tất cả các điểm đã hiển thị, tính và hiển thị tổng khoảng cách
            if (algorithmType === 'BranchAndBound') {
                const totalDistance = calculateTotalDistance(dataResponse);
                totalDistanceElement.innerText = `Tổng quảng đường di chuyển: ${totalDistance.toFixed(2)} km`;
            } else {
                totalDistanceElement.innerText = ""; // Xóa tổng khoảng cách cho A*
            }
            return;
        }

        const location = dataResponse[i];
        const { cx, cy } = convertGPSToPixel(location.lat, location.long);

        var point = document.createElement('div');
        point.className = 'point2';
        point.style.left = `${cx}px`;
        point.style.top = `${cy}px`;

        document.querySelector('.inner').appendChild(point);

        i++;
        setTimeout(showNextPoint, 1000); // Hiển thị điểm tiếp theo sau 1 giây
    }

    // Bắt đầu hiển thị các điểm
    showNextPoint();

    // Vẽ các đường giữa các điểm đánh dấu
    drawLinesBetweenMarkers(dataResponse);
}



