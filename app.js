var app = require('http').createServer(resposta); //Criando servidor como método principal a ser requisitado uma função resposta.
var fs = require('fs');	//Sistema de arquivos													
var io = require('socket.io')(app);	//Socket.IO											
var usuarios = []; 	// Array de Lista de usuários	
var ultimas_mensagens = [];	//Array de Lista com ultimas mensagens enviadas no chat
var porta = 3000;


app.listen(porta);//Escutando na porta 3000
console.log("Aplicação em execução...");

// Função principal de resposta as requisições do servidor
function resposta(req, res){
	var arquivo = "";
	if (req.url == "/") {
		arquivo = __dirname + '/index.html';
	} else {
		arquivo = __dirname + req.url; //Carregando os arquivos que são passados na URL da solicitação
	}

	fs.readFile(arquivo, 
		function (err, data){	
			if (err) {
				res.writeHead(404);
				return res.end('Pagina ou arquivo nao encontrado');
			}

			res.writeHead(200);
			res.end(data);
		}
	);
}

//recebendo mensagens do cliente
io.on("connection", function (socket) {

	// Método de resposta ao evento de entrar
	socket.on("entrar", function (apelido, callback) {
		
		if (!(apelido in usuarios)) {
			// socket.apelido = socket.handshake.address;
			socket.apelido = apelido
			
			usuarios[apelido] = socket;	// Adicionadno o nome de usuário a lista armazenada no servidor
			
			// Enviar para o usuário ingressante as ultimas mensagens armazenadas.
			for (indice in ultimas_mensagens) {
				socket.emit("atualizar mensagens", ultimas_mensagens[indice]);
			}

			var mensagem = "[ " + socket.handshake.address + " / " + porta + " - " + pegarDataAtual() + " ] " + apelido + " acabou de entrar na sala";
			var obj_mensagem = {msg: mensagem, tipo: 'sistema'};

			io.sockets.emit("atualizar usuarios", Object.keys(usuarios)); // Enviando a nova lista de usuários
			io.sockets.emit("atualizar mensagens", obj_mensagem); // Enviando mensagem anunciando entrada do novo usuário

			armazenaMensagem(obj_mensagem); //Guardando a mensagem na lista do histórico
			
			callback(true);
		} else {
			callback(false);
		}
	});

	// Método responsável para mudar usuário
	socket.on("enviar apelido", function (apelido, callback) {
		
		delete usuarios[apelido.nome]
		socket.apelido = apelido.novo_nome
		usuarios[apelido.novo_nome] = socket;

		callback();
		
	});

	//Enviando mensagens
	socket.on("enviar mensagem", function (dados, callback) {

		var mensagem_enviada = dados.msg;
		var usuario = dados.usu;

		if (usuario == null)
			usuario = ''; 	// Caso não tenha um usuário, a mensagem será enviada para todos da sala
		
			mensagem_enviada = "[ " + socket.handshake.address + " / " + porta + " - " + pegarDataAtual() + "]: " + socket.apelido + " diz | " + mensagem_enviada ;
			var obj_mensagem = {msg: mensagem_enviada, tipo: '', usuario: socket.apelido};

			if(usuario == ''){
				io.sockets.emit("atualizar mensagens", obj_mensagem);
				armazenaMensagem(obj_mensagem); // Armazenando a mensagem
			}else{
				obj_mensagem.tipo = 'privada'; //Mensagem privada
				socket.emit("atualizar mensagens", obj_mensagem); // Emitindo a mensagem para o usuário que a enviou
				usuarios[usuario].emit("atualizar mensagens", obj_mensagem); // Emitindo a mensagem para o usuário escolhido
			}
		
			callback();
	});

	//saindo do chat
	socket.on("disconnect", function () {
		delete usuarios[socket.apelido];
		var mensagem = "[ " + pegarDataAtual() + "]: " + socket.apelido + " saiu da sala";
		var obj_mensagem = {msg: mensagem, tipo: 'sistema'};

		// No caso da saída de um usuário, a lista de usuários é atualizada junto de um aviso para os participantes da sala		
		io.sockets.emit("atualizar usuarios", Object.keys(usuarios));
		io.sockets.emit("atualizar mensagens", obj_mensagem );

		armazenaMensagem(obj_mensagem);
	});
});

// Função para apresentar uma String com a data e hora em formato DD/MM/AAAA HH:MM:SS
function pegarDataAtual() {
	var dataAtual = new Date();
	var dia = (dataAtual.getDate()<10 ? '0' : '') + dataAtual.getDate();
	var mes = ((dataAtual.getMonth() + 1)<10 ? '0' : '') + (dataAtual.getMonth() + 1);
	var ano = dataAtual.getFullYear();
	var hora = (dataAtual.getHours()<10 ? '0' : '') + dataAtual.getHours();
	var minuto = (dataAtual.getMinutes()<10 ? '0' : '') + dataAtual.getMinutes();
	var segundo = (dataAtual.getSeconds()<10 ? '0' : '') + dataAtual.getSeconds();

	var dataFormatada = dia + "/" + mes + "/" + ano + " " + hora + ":" + minuto + ":" + segundo;
  	return dataFormatada;
}

// Função para guardar as mensagens e seu tipo na variável de ultimas mensagens
function armazenaMensagem(mensagem) {
	if (ultimas_mensagens.length > 5) {
		ultimas_mensagens.shift();
	}
	ultimas_mensagens.push(mensagem);
}
