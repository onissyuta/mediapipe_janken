(() => {
    document.addEventListener("DOMContentLoaded", main, false);

    // グローバル変数
    let playerHand = new Hand(0);
    let flag = false;
    let images;

    // プレイボタン
    const playBtn = document.getElementById("start-game");
    const playx5Btn = document.getElementById("start-gamex5");


    async function main() {
        // MediaPipeの初期化
        initialize();

        images = [
            await loadImage("src/img/hand/0.png"),
            await loadImage("src/img/hand/1.png"),
            await loadImage("src/img/hand/2.png"),
        ];

        playBtn.addEventListener("click", () => playJanken(1));
        playx5Btn.addEventListener("click", () => playJanken(5));

        document.addEventListener("keydown", event => {
            if (event.code === "Space") {
                playJanken(1);
            }
        });

        document.addEventListener("keydown", event => {
            if (event.code === "Enter") {
                playJanken(5);
            }
        });
    }


    function initialize() {
        // カメラの初期化
        const video = document.getElementById("video");
        const camera = new Camera(video, {
            onFrame: async () => {
                await hands.send({ image: video });
            },
            width: 672,
            height: 504
        });
        camera.start()


        // handsの初期化
        const hands = new Hands({
            locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        hands.setOptions({
            selfieMode: true,
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults(recvResults);
    }


    function recvResults(results) {
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        ctx.rect(0, 0, canvas.width, 48);
        ctx.fillStyle = "rgba(0, 0, 0, .5)";
        ctx.fill();

        ctx.font = "16px sans-serif"; 
        ctx.fillStyle = "White";
        ctx.fillText("現在の手:", 24, 30);
        ctx.fillText("関節の角度の合計:" , canvas.width - 200, 30);


        if (results.multiHandLandmarks) {
            results.multiHandLandmarks.forEach(marks => {
                drawConnectors(ctx, marks, HAND_CONNECTIONS, { color: "#fff", lineWidth: 5 });
                drawLandmarks(ctx, marks, { color: "#7e00ff", lineWidth: 5 });

                const calc = getTotalJointDeg(marks);
                playerHand = detectPosture(calc);

                ctx.fillText(playerHand.name, 102  , 30);
                ctx.fillText(Math.floor(calc), canvas.width - 60, 30);  
            })
        }

    }

    function getTotalJointDeg(marks) {
        return vecDeg(vec(marks[1],marks[0]), vec(marks[1],marks[2]))
            + vecDeg(vec(marks[2],marks[1]), vec(marks[2],marks[3]))
            + vecDeg(vec(marks[3],marks[2]), vec(marks[3],marks[4]))
            + vecDeg(vec(marks[5],marks[0]), vec(marks[5],marks[6]))
            + vecDeg(vec(marks[6],marks[5]), vec(marks[6],marks[7]))
            + vecDeg(vec(marks[7],marks[6]), vec(marks[7],marks[8]))
            + vecDeg(vec(marks[9],marks[0]), vec(marks[9],marks[10]))
            + vecDeg(vec(marks[10],marks[9]), vec(marks[10],marks[11]))
            + vecDeg(vec(marks[11],marks[10]), vec(marks[11],marks[12]))
            + vecDeg(vec(marks[13],marks[0]), vec(marks[13],marks[14]))
            + vecDeg(vec(marks[14],marks[13]), vec(marks[14],marks[15]))
            + vecDeg(vec(marks[15],marks[14]), vec(marks[15],marks[16]))
            + vecDeg(vec(marks[17],marks[0]), vec(marks[17],marks[18]))
            + vecDeg(vec(marks[18],marks[17]), vec(marks[18],marks[19]))
            + vecDeg(vec(marks[19],marks[18]), vec(marks[19],marks[20]));
    }


    function detectPosture(value) {
        if (800 <= value) {
            return new Hand(0);
        } else if (300 <= value && value < 800) {
            return new Hand(1);
        } else {
            return new Hand(2);
        }
    }

    // ベクトルをオブジェクトで表現
    // 座標からベクトルの成分と大きさを計算（A点を始点）
    function vec(A, B) {
        return {
            x: B.x - A.x, // (終点) - (始点)
            y: B.y - A.y,
            z: B.z - A.z,
            length: Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2) + Math.pow(B.z - A.z, 2)) // ベクトルの2乗は大きさの2乗
        };
    }

    // 2ベクトルのなす角を計算
    function vecDeg(A, B) {
        // ベクトルの内積
        const innerProd = A.x * B.x + A.y * B.y + A.z * B.z;

        // 2ベクトルがなす角のcos
        const cos = innerProd / (A.length * B.length);

        // acosを度数法で返す
        return 180 - (Math.acos(cos) / (Math.PI / 180)); // 180度からの角度
    }

    
    // handA.idがhandBに0:引き分け 1:負け 2:勝ち
    function judgeJanken(handA, handB) {
        if (handA == null) return 1;

        if (handA.id === handB.id) {
            return 0;
        } else if (handA.id === 0) {
            if (handB.id === 1) {
                return 2;
            } else if (handB.id === 2) {
                return 1;
            }
        } else if (handA.id === 1) {
            if (handB.id === 0) {
                return 1;
            } else if (handB.id === 2) {
                return 2;
            }
        } else if (handA.id === 2) {
            if (handB.id === 0) {
                return 2;
            } else if (handB.id === 1) {
                return 1;
            }
        }
    }


    function Hand(id) {
        this.id = id;
        this.hands = ["グー", "チョキ", "パー"];
        this.name = this.hands[id];
    }


    async function playJanken(num) {
        if (!flag) { // 多重起動防止
            flag = true;

            playBtn.setAttribute("disabled", "true");
            playx5Btn.setAttribute("disabled", "true");

            let result = 1;
            for (let i = 0; i < num; i++) {
                do {
                    result = await fetchJankenGame(result);
                } while (!result); // あいこじゃ なくなるまで
            }

            flag = false;
            playBtn.removeAttribute("disabled");
            playx5Btn.removeAttribute("disabled");
        }
    }


    function fetchJankenGame(result) { // result: falseであいこモード
        const canvas = document.getElementById("cpu-canvas");
        const ctx = canvas.getContext("2d");
        const divResult = document.getElementById("result");

        return new Promise(resolve => {
            divResult.textContent = "";
            divResult.dataset.result = "";

            new Audio(result ? "src/audio/janken.mp3" : "src/audio/aikode.mp3").play();

            let count = 0;
            const id = setInterval(() => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(images[count], 0, 0, 1000, 1000, 0, 0, canvas.width, canvas.height);
                if (++count > 2) count = 0;
            }, 100);

            setTimeout(() => {
                resolve(id);
            }, 1300);


        }).then(id => {
            return new Promise(resolve => {
                new Audio(result ? "src/audio/pon.mp3" : "src/audio/sho.mp3").play();

                setTimeout(() => resolve(id), 400); // 手を出す時間を考慮してちょっと待つ
            })
        }).then(id => {
            return new Promise(resolve => {
                clearInterval(id); // ルーレット止める

                const cpuHand = new Hand(Math.floor(Math.random() * 3));

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(images[cpuHand.id], 0, 0, 1000, 1000, 0, 0, canvas.width, canvas.height);

                const result = judgeJanken(playerHand, cpuHand);

                const resultName = ["引き分け", "負け", "勝ち"];
                divResult.dataset.result = result;
                divResult.textContent = resultName[result];

                setTimeout(() => resolve(result), 1000);
            })
        });
    }


    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const imageIns = new Image();
            imageIns.src = src;
            imageIns.onload = () => resolve(imageIns);
            imageIns.onerror = () => reject();
        })
    };

})()


// https://qiita.com/redrabbit1104/items/2308a79b4d670f5019b9 関数式
// https://liginc.co.jp/344056
// https://qiita.com/saka212/items/9b6cfe06b464580c2ee6
// https://qiita.com/uturned0/items/6f19b32ec1154e63b453