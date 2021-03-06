import $ from 'jquery';
import * as bootstrap from "bootstrap";

import { db, storageRef } from '../config/fb';

import { Controller } from './Controller';
import { TimeView } from '../views/TimeView';
import { Time } from '../models/Time';
import { Colaborador } from '../models/Colaborador';
import { MensagemView } from '../views/MensagemView';

export class TimeController extends Controller {
    constructor() {
        super();
        this._inputNome = $('#InputNome');
        this._inputNick = $('#InputNick');
        this._timeView = new TimeView($('#timeView'));
        this._mensagemView = new MensagemView('#mensagemView');
    }

    onUserLogged() {
        this._init();
    }

    _init() {
        this._timeView.render();
        $("#lds-spinner").show();
        db.child(`colaboradores/${this.user.id}/times`).on('value', snapshot => {
            $('#times-painel-lateral').empty();
            $('#times-painel-lateral-nao-aceito').empty();
            if (snapshot.exists()) {
                snapshot.forEach(value => {
                    if (value.val()) {
                        db.child(`time/${value.key}`).on('value', snapshotTime => {
                            if(snapshotTime.exists())
                                $('#times-painel-lateral').append(this._timeView.painelLateral(snapshotTime.val(), snapshotTime.key));
                        });
                    } else {
                        db.child(`time/${value.key}`).on('value', snapshotTime => {
                            if(snapshotTime.exists())
                                $('#times-painel-lateral-nao-aceito').append(this._timeView.painelLateralNaoAceito(snapshotTime.val(), snapshotTime.key));
                        });
                    }
                    $("#lds-spinner").hide();
                });
            } else {
                $("#lds-spinner").hide();
            }
        });
    }

    adicionaTime(event) {
        event.preventDefault();
        let time = this._criaTime();
        db.child('time').push(time).then(snapshot => {
            this._adicionaTimeColaborador(this.user.id, snapshot.key);
        }).catch(function (error) {
            console.error("Erro ao criar Time ", error);
        });
        $('#modalCriaTime').modal('hide');
        this._limpaFormulario();
    }

    _adicionaTimeColaborador(chaveUsuario, chaveTime) {
        db.child(`colaboradores/${chaveUsuario}/times`).update({
            [chaveTime]: true
        }).then(function () {
            console.info("Criou o Time Colaborador ");
        }).catch(function (error) {
            console.error("Erro ao criar timeColaborador ", error);
        });
    }

    buscaDetalheTime() {
        $(".d-flex").removeClass("fundoCinza");
        $('#formTimeTudo').show();
        $("#projetosTime").hide();
        $('#panel-speakers').hide();
        db.child('time').child(this._recuperaChaveTime()).on('value', snapshot => {
            $('#UID').val(snapshot.key);
            $('#InputNome').val(snapshot.val()._nome);
            $('#InputNick').val(snapshot.val()._nick);
        });
    }

    atualizaTime(event) {
        event.preventDefault();
        let time = this._criaTime();
        let chaveTime = $('#UID').val();
        let updates = {};
        updates[`/time/${chaveTime}`] = time;
        db.update(updates);
        $(location).attr('href', 'home.html');
    }

    // //TODO: Rever 
    procuraPorEmail(event) {
        event.preventDefault();
        let email = $('#InputEmail').val();
        $("#mensagemView").empty();
        let achou = false;
        db.child(`usuario`).orderByChild('email').equalTo(email).on('child_added', snapshot => {
            if (snapshot.exists()) {
                this.convidaMembro(snapshot.val().uid);
                achou = true;
            }    
        });
        if(!achou) {
            $("#mensagemView").append(this._mensagemView.template(`Colaborador não encontrado`));
        }
    }

    convidaMembro(uid) {
        $("#mensagemView").empty();
        if(uid === this.user.id) {
            $("#mensagemView").append(this._mensagemView.template(`Voce não pode colocar o seu e-mail!`));
        } else {
            let chaveTime = $('#UID').val();
            db.child('time').child(chaveTime).child('_colaboradores').update({
                [uid]: false
            }).then(() => {
                db.child(`colaboradores/${uid}/times`).update({
                    [chaveTime]: false
                })
                .then(() => $("#mensagemView").append(this._mensagemView.template(`Colaborador Convidado!`)))
                .catch((error) => $("#mensagemView").append(this._mensagemView.template(`Houve um erro tente novamente!: error ${error}`)));
            });
        }
    }

    aceitaColaboradorTime(chaveTime, verficaAceite) {
        $("#mensagemView").empty();
        db.child('time').child(chaveTime).child('_colaboradores').update({
            [this.user.id]: verficaAceite
        }).then(() => {
            db.child(`colaboradores/${this.user.id}/times`).update({
                [chaveTime]: verficaAceite
            }).then(() => $("#mensagemView").append(this._mensagemView.template(`Aceito!`)))
        }).catch(error => console.error("Erro ao criar timeColaborador ", error))
        .finally(() => $('#modalAceita').modal('hide'));
    }

    recusarColaboradorTime(chaveTime) {
        db.child('time').child(chaveTime).child('_colaboradores').child(this.user.id).remove().then(() => {
            db.child(`colaboradores/${this.user.id}/times`).child(chaveTime).remove();
        })
        .catch(error => console.error("Erro ao criar timeColaborador ", error))
        .finally(() => $('#modalAceita').modal('hide'));
    }

    listaColaboradorTime() {
        $(".d-flex").addClass("fundoCinza");
        $('#listaMembros').empty();
        let chaveTime = this._recuperaChaveTime();
        db.child(`time/${chaveTime}/_colaboradores`).on('value', snapshot => {
            snapshot.forEach(value => {
                db.child(`usuario/${value.key}`).on('value', snapshotUsuario => {
                    console.log(snapshotUsuario.val().fotoUrl);
                    $('#formTimeTudo').hide();
                    $("#projetosTime").hide();
                    $('#panel-speakers').show();
                    $('#listaMembros').append(this._timeView.listaMembros(snapshotUsuario.val()));
                });
            });
        });
    }

    _recuperaChaveTime() {
        let url_string = window.location.href;
        let url = new URL(url_string);
        return (url.searchParams.get("chave"));
    }

    _criaTime() {
        let usuarioLogado = new Colaborador(this.user.id, true);
        return new Time(
            this._inputNome.val(),
            this._inputNick.val(),
            usuarioLogado
        );
    }

    projetoTime() {
        $("#panel-speakers").hide();
        $("#formTimeTudo").hide();
        $("#projetosTime").show();
        let that = this;
        db.child(`time/${this._recuperaChaveTime()}/_projeto`).on('value', snapshot => {
            if (snapshot.exists()) {
                $('#painelProjetoPrincipal').empty();
                snapshot.forEach(value => {
                    db.child(`projeto/${value.key}`).once('value', snapshotProjeto => {
                        if(snapshotProjeto.exists())    
                            $('#painelProjetoPrincipal').append(that._timeView.linha(snapshotProjeto.val(), snapshotProjeto.key));
                    })
                })
            }
        });
    }

    criaProjetoTime(event) {
        event.preventDefault();

        if ($("#InputNomeProjetoTime").val() !== "" && $("#InputNomeProjetoTime").val() !== 'undefined') {
            let projeto = {
                _time: this._recuperaChaveTime(),
                _nome: $("#InputNomeProjetoTime").val(),
                _colaboradores: {
                    [this.user.id]: true
                },
                _admin: {
                    bloqueado: false,
                    finalizado: false,
                    arquivado: false,
                }
            };

            db.child('projeto').push(projeto).then(snapshot => {
                db.child(`colaboradores/${this.user.id}/projeto`).update({
                    [snapshot.key]: {
                        admin: true
                    }
                });
                db.child(`time/${this._recuperaChaveTime()}/_projeto`).update({
                    [snapshot.key]: true
                });
            })
            .catch((error) => console.error("Erro ao criar Projeto ", error))
            .finally(() => $('#modalCriaProjeto').modal('hide'));
            this._limpaFormulario();
        }
    }

    // TODO: Deve excluir os times vinculados
    _excluirTime() {
        db.child(`time/${this._recuperaChaveTime()}`).remove();
        $(location).attr('href', 'home.html');
    }

    criaTimeProjeto() {
        $("#InputIDTime").val(this._recuperaChaveTime());
        $('#modalCriaProjeto').modal('show');
    }

    _limpaFormulario() {
        this._inputNome.val("");
        this._inputNick.val("");
        this._inputNome.focus();
    }
}