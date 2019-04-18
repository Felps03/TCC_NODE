import $ from 'jquery';

import { db } from '../config/fb';

import { Controller } from './Controller';
import { Coluna } from '../models/Coluna';

export class ColunaController extends Controller {
    constructor(kb) {
        super();
        this._kanban = kb;
        this._inputTitle = $('#InputTituloColuna');
        this._inputClass = $('#InputClasseColuna');
        this._inputLimitador = $('#InputLimitadorColuna');
    }

    onUserLogged() {
        this._init();
    }

    _init() {
        db.child(`coluna`).on('value', snapshot => {
            snapshot.forEach(value => {
                this._kanban.removeBoard(value.key);
            });

            // this._kanban.removeElement(cartaoSnapshot.key);
            
            snapshot.forEach(value => {
                this._kanban.addBoards([{
                    "id": value.key,
                    "title": value.val().title,
                    "class": value.val().class,
                }]);
                db.child(`coluna/${value.key}/cartao`).on('child_added', snapshotCartao => {
                    db.child(`cartao/${snapshotCartao.key}`).on('value', cartaoSnapshot => {
                        this._kanban.addElement(value.key, {
                            "id": cartaoSnapshot.key,
                            "title": cartaoSnapshot.val().title,
                            "drag": function (el, test) {
                                // remove
                                console.log('Id do Cartão: ', el.dataset.eid);
                                console.log('Id da Coluna Inicio: ', test.parentNode.dataset.id);
                            },
                            "drop": function (el, event) {
                                // insere
                                console.log('Id do Cartão: ', el.dataset.eid);
                                console.log('Id da Coluna Final: ', event.parentNode.dataset.id);
                            }
                        });
                    })
                })
            });
        });
    }

    // _atualizaColuna(chaveCartao, chaveColuna) {
    _atualizaColunaCartao() {
        // Remover
        event.preventDefault();

        let chaveCartao = '-LclOPO3VqoSPBH30H10';
        let chaveColuna = '-LclJBWG2_eXxaqsadhg';
        db.child(`coluna/${chaveColuna}/cartao`).update({
            [chaveCartao]: true
        }).then(function () {
            console.info("Atualiza Coluna ");
        }).catch(function (error) {
            console.error("Erro ao criar coluna ", error);
        });
    }

    _removeColunaCartao(){
        // Remover
        event.preventDefault();

        let chaveCartao = '-LclOPO3VqoSPBH30H10';
        let chaveColuna = '-LclJBWG2_eXxaqsadhg';
        db.child(`coluna/${chaveColuna}/cartao/${chaveCartao}`).remove().then(function () {
            console.info("Atualiza Coluna ");
        }).catch(function (error) {
            console.error("Erro ao criar coluna ", error);
        });

    }

    adicionaColuna(event) {
        event.preventDefault();
        let coluna = this._criaColuna();
        db.child('coluna').push(coluna).then(snapshot => {
            this.adicionaColunaProjeto(snapshot.key);
        }).catch(function (error) {
            console.error("Erro ao criar projeto ", error);
        });
        this._limpaFormulario();
    }

    adicionaColunaProjeto(chaveColuna) {
        let chaveProjeto = this._recuperaChaveProjeto();

        db.child(`projeto/${chaveProjeto}/coluna`).update({
            [chaveColuna]: true
        }).then(function () {
            console.info("Criou o Projeto Colaborador ");
        }).catch(function (error) {
            console.error("Erro ao criar projetoColaborador ", error);
        });
    }

    _recuperaChaveProjeto() {
        let url_string = window.location.href;
        let url = new URL(url_string);
        return (url.searchParams.get("chave"));
    }

    _criaColuna() {
        return new Coluna(
            this._recuperaChaveProjeto(),
            this._inputTitle.val(),
            // this._inputClass.val(),
            // this._inputLimitador.val()
        );
    }

    _limpaFormulario() {
        this._inputTitle.value = '';
        this._inputClass.value = '';
        this._inputLimitador.value = '';
        this._inputTitle.focus();
    }
}
