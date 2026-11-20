const BOOKS_API_URL = 'http://localhost:8080/api/livros';
const CLIENTS_API_URL = 'http://localhost:8080/api/clientes';
const LOANS_API_URL = 'http://localhost:8080/api/emprestimos';
const CATEGORIES = ['ROMANCE','FANTASIA','TERROR','MISTERIO','BIOGRAFIA','HISTORIA','TECNICO','OUTROS'];

let books = [], editingBookId = null, deletingBookId = null;
let clients = [], editingClientId = null, deletingClientId = null;
let loans = [], returningLoanId = null;

const $ = (selector) => document.querySelector(selector);

// Modais Livros
const bookModal = new bootstrap.Modal($('#book-modal'));
const detailsModal = new bootstrap.Modal($('#details-modal'));
const deleteModal = new bootstrap.Modal($('#delete-modal'));

// Modais Clientes
const clientModal = new bootstrap.Modal($('#client-modal'));
const clientDetailsModal = new bootstrap.Modal($('#client-details-modal'));
const clientDeleteModal = new bootstrap.Modal($('#client-delete-modal'));

// Modais Empréstimos
const loanModal = new bootstrap.Modal($('#loan-modal'));
const loanDetailsModal = new bootstrap.Modal($('#loan-details-modal'));
const loanReturnModal = new bootstrap.Modal($('#loan-return-modal'));

document.addEventListener('DOMContentLoaded', () => {
  CATEGORIES.forEach(c => $('#categoria').insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`));
  setupTabs();
  loadBooks();
});

// Navegação de Abas
function setupTabs() {
  $('#tab-books').addEventListener('click', () => switchTab('books'));
  $('#tab-clients').addEventListener('click', () => switchTab('clients'));
  $('#tab-loans').addEventListener('click', () => switchTab('loans'));
}

function switchTab(tab) {
  $('#tab-books').classList.toggle('active', tab === 'books');
  $('#tab-clients').classList.toggle('active', tab === 'clients');
  $('#tab-loans').classList.toggle('active', tab === 'loans');

  $('#section-books').style.display = tab === 'books' ? 'block' : 'none';
  $('#section-clients').style.display = tab === 'clients' ? 'block' : 'none';
  $('#section-loans').style.display = tab === 'loans' ? 'block' : 'none';

  if (tab === 'books') loadBooks();
  else if (tab === 'clients') loadClients();
  else if (tab === 'loans') loadLoans();
}

// Eventos Livros
$('#new-book-btn').addEventListener('click', openCreateBook);
$('#book-form').addEventListener('submit', saveBook);
$('#confirm-delete-btn').addEventListener('click', deleteBook);

// Eventos Clientes
$('#new-client-btn').addEventListener('click', openCreateClient);
$('#client-form').addEventListener('submit', saveClient);
$('#confirm-delete-client-btn').addEventListener('click', deleteClient);

// Eventos Empréstimos
$('#new-loan-btn').addEventListener('click', openCreateLoan);
$('#loan-form').addEventListener('submit', saveLoan);
$('#confirm-return-loan-btn').addEventListener('click', returnLoan);

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  let data = null;
  if (response.status !== 204) {
    try { data = await response.json(); } catch {}
  }
  if (!response.ok) throw new Error(data?.message || `Não foi possível concluir a operação (${response.status}).`);
  return data;
}

// ------------------- LIVROS -------------------
async function loadBooks() {
  try {
    books = await request(BOOKS_API_URL) || [];
    renderBooks();
  } catch (error) {
    renderBooksError(error.message);
  }
}

function renderBooks() {
  const body = $('#books-body');
  if (!books.length) {
    body.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-5">Nenhum livro cadastrado.</td></tr>';
    return;
  }
  body.innerHTML = books.map(book => `
    <tr>
      <td class="fw-semibold">${escapeHtml(book.titulo)}</td>
      <td>${escapeHtml(book.autor)}</td>
      <td class="text-nowrap">${escapeHtml(book.isbn)}</td>
      <td><span class="badge badge-category">${book.categoria}</span></td>
      <td>${book.anoPublicacao}</td>
      <td>${book.quantidade}</td>
      <td class="text-end text-nowrap">
        <button class="action-btn" title="Ver detalhes" onclick="showDetails('${book.id}')">👁</button>
        <button class="action-btn" title="Editar" onclick="openEdit('${book.id}')">✎</button>
        <button class="action-btn text-danger" title="Excluir" onclick="openDelete('${book.id}')">⌫</button>
      </td>
    </tr>
  `).join('');
}

function openCreateBook() {
  editingBookId = null;
  $('#book-modal-title').textContent = 'Novo livro';
  $('#book-form').reset();
  $('#book-form').classList.remove('was-validated');
  bookModal.show();
}

function openEdit(id) {
  const book = books.find(item => item.id === id);
  if (!book) return;
  editingBookId = id;
  $('#book-modal-title').textContent = 'Editar livro';
  Object.entries(book).forEach(([key, value]) => {
    const field = $(`#${key}`);
    if (field) field.value = value;
  });
  $('#book-form').classList.remove('was-validated');
  bookModal.show();
}

async function saveBook(event) {
  event.preventDefault();
  const form = $('#book-form');
  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }
  const payload = Object.fromEntries(new FormData(form));
  payload.anoPublicacao = Number(payload.anoPublicacao);
  payload.quantidade = Number(payload.quantidade);

  const button = $('#save-btn');
  button.disabled = true;
  button.textContent = 'Salvando...';

  try {
    if (editingBookId) {
      await request(`${BOOKS_API_URL}/${editingBookId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await request(BOOKS_API_URL, { method: 'POST', body: JSON.stringify(payload) });
    }
    bookModal.hide();
    showAlert(editingBookId ? 'Livro atualizado com sucesso.' : 'Livro cadastrado com sucesso.', 'success');
    await loadBooks();
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    button.disabled = false;
    button.textContent = 'Salvar livro';
  }
}

async function showDetails(id) {
  try {
    const book = await request(`${BOOKS_API_URL}/${id}`);
    $('#details-body').innerHTML = `
      <dl class="row mb-0">
        <dt class="col-5">Título</dt><dd class="col-7">${escapeHtml(book.titulo)}</dd>
        <dt class="col-5">Autor</dt><dd class="col-7">${escapeHtml(book.autor)}</dd>
        <dt class="col-5">ISBN</dt><dd class="col-7">${escapeHtml(book.isbn)}</dd>
        <dt class="col-5">Categoria</dt><dd class="col-7">${book.categoria}</dd>
        <dt class="col-5">Ano</dt><dd class="col-7">${book.anoPublicacao}</dd>
        <dt class="col-5">Quantidade</dt><dd class="col-7">${book.quantidade}</dd>
      </dl>
    `;
    detailsModal.show();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

function openDelete(id) {
  deletingBookId = id;
  deleteModal.show();
}

async function deleteBook() {
  if (!deletingBookId) return;
  const button = $('#confirm-delete-btn');
  button.disabled = true;
  try {
    await request(`${BOOKS_API_URL}/${deletingBookId}`, { method: 'DELETE' });
    deleteModal.hide();
    showAlert('Livro excluído com sucesso.', 'success');
    await loadBooks();
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    deletingBookId = null;
    button.disabled = false;
  }
}

function renderBooksError(message) {
  $('#books-body').innerHTML = `<tr><td colspan="7" class="text-center text-danger py-5">${escapeHtml(message)}</td></tr>`;
}

// ------------------- CLIENTES -------------------
async function loadClients() {
  try {
    clients = await request(CLIENTS_API_URL) || [];
    renderClients();
  } catch (error) {
    renderClientsError(error.message);
  }
}

function formatDateOnly(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function getStatusBadge(client) {
  const status = typeof client === 'string' ? client : client?.status;
  if (status === 'SUSPENSO') {
    const dateFormatted = client?.dataFimSuspensao ? ` (até ${formatDateOnly(client.dataFimSuspensao)})` : '';
    return `<span class="badge badge-status-suspenso">SUSPENSO${dateFormatted}</span>`;
  }
  const cls = status === 'ATIVO' ? 'badge-status-ativo' : 'badge-status-inativo';
  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

function getSituacaoBadge(situacao) {
  const cls = situacao === 'COM_LIVRO' ? 'badge-com-livro' : 'badge-sem-livro';
  const label = situacao === 'COM_LIVRO' ? 'Com livro' : 'Sem livro';
  return `<span class="badge ${cls}">${label}</span>`;
}

function renderClients() {
  const body = $('#clients-body');
  if (!clients.length) {
    body.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-5">Nenhum cliente cadastrado.</td></tr>';
    return;
  }
  body.innerHTML = clients.map(client => `
    <tr>
      <td class="fw-semibold">${escapeHtml(client.nome)}</td>
      <td class="text-nowrap">${escapeHtml(client.matricula)}</td>
      <td>${escapeHtml(client.email)}</td>
      <td class="text-nowrap">${escapeHtml(client.telefone)}</td>
      <td>${getStatusBadge(client)}</td>
      <td>${getSituacaoBadge(client.situacao)}</td>
      <td class="text-end text-nowrap">
        <button class="action-btn" title="Ver detalhes" onclick="showClientDetails('${client.id}')">👁</button>
        <button class="action-btn" title="Editar" onclick="openEditClient('${client.id}')">✎</button>
        <button class="action-btn text-danger" title="Excluir" onclick="openDeleteClient('${client.id}')">⌫</button>
      </td>
    </tr>
  `).join('');
}

function openCreateClient() {
  editingClientId = null;
  $('#client-modal-title').textContent = 'Novo cliente';
  $('#client-form').reset();
  $('#client-status').value = 'ATIVO';
  $('#client-situacao').value = 'SEM_LIVRO';
  $('#client-form').classList.remove('was-validated');
  clientModal.show();
}

function openEditClient(id) {
  const client = clients.find(item => item.id === id);
  if (!client) return;
  editingClientId = id;
  $('#client-modal-title').textContent = 'Editar cliente';
  $('#client-nome').value = client.nome || '';
  $('#client-matricula').value = client.matricula || '';
  $('#client-email').value = client.email || '';
  $('#client-telefone').value = client.telefone || '';
  $('#client-status').value = client.status || 'ATIVO';
  $('#client-situacao').value = client.situacao || 'SEM_LIVRO';
  $('#client-form').classList.remove('was-validated');
  clientModal.show();
}

async function saveClient(event) {
  event.preventDefault();
  const form = $('#client-form');
  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }
  const payload = Object.fromEntries(new FormData(form));

  const button = $('#save-client-btn');
  button.disabled = true;
  button.textContent = 'Salvando...';

  try {
    if (editingClientId) {
      await request(`${CLIENTS_API_URL}/${editingClientId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await request(CLIENTS_API_URL, { method: 'POST', body: JSON.stringify(payload) });
    }
    clientModal.hide();
    showAlert(editingClientId ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.', 'success');
    await loadClients();
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    button.disabled = false;
    button.textContent = 'Salvar cliente';
  }
}

async function showClientDetails(id) {
  try {
    const client = await request(`${CLIENTS_API_URL}/${id}`);
    $('#client-details-body').innerHTML = `
      <dl class="row mb-0">
        <dt class="col-5">Nome</dt><dd class="col-7">${escapeHtml(client.nome)}</dd>
        <dt class="col-5">Matrícula</dt><dd class="col-7">${escapeHtml(client.matricula)}</dd>
        <dt class="col-5">E-mail</dt><dd class="col-7">${escapeHtml(client.email)}</dd>
        <dt class="col-5">Telefone</dt><dd class="col-7">${escapeHtml(client.telefone)}</dd>
        <dt class="col-5">Status</dt><dd class="col-7">${getStatusBadge(client)}</dd>
        <dt class="col-5">Situação</dt><dd class="col-7">${getSituacaoBadge(client.situacao)}</dd>
      </dl>
    `;
    clientDetailsModal.show();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

function openDeleteClient(id) {
  deletingClientId = id;
  clientDeleteModal.show();
}

async function deleteClient() {
  if (!deletingClientId) return;
  const button = $('#confirm-delete-client-btn');
  button.disabled = true;
  try {
    await request(`${CLIENTS_API_URL}/${deletingClientId}`, { method: 'DELETE' });
    clientDeleteModal.hide();
    showAlert('Cliente excluído com sucesso.', 'success');
    await loadClients();
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    deletingClientId = null;
    button.disabled = false;
  }
}

function renderClientsError(message) {
  $('#clients-body').innerHTML = `<tr><td colspan="7" class="text-center text-danger py-5">${escapeHtml(message)}</td></tr>`;
}

// ------------------- EMPRÉSTIMOS -------------------
async function loadLoans() {
  try {
    loans = await request(LOANS_API_URL) || [];
    renderLoans();
  } catch (error) {
    renderLoansError(error.message);
  }
}

function getLoanStatusBadge(status) {
  let cls = 'badge-status-emprestimo-ativo';
  let label = 'Ativo';
  if (status === 'DEVOLVIDO') {
    cls = 'badge-status-emprestimo-devolvido';
    label = 'Devolvido';
  } else if (status === 'ATRASADO') {
    cls = 'badge-status-emprestimo-atrasado';
    label = 'Atrasado';
  } else if (status === 'PARCIALMENTE_DEVOLVIDO') {
    cls = 'badge-status-emprestimo-parcial';
    label = 'Parcialmente Devolvido';
  }
  return `<span class="badge ${cls}">${label}</span>`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function renderLoans() {
  const body = $('#loans-body');
  if (!loans.length) {
    body.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-5">Nenhum empréstimo registrado.</td></tr>';
    return;
  }
  body.innerHTML = loans.map(loan => {
    const clientName = loan.cliente?.nome || 'Cliente não identificado';
    const booksSummary = (loan.livros || []).map(b => escapeHtml(b.titulo)).join(', ') || 'Nenhum livro';
    const isDevolvido = loan.status === 'DEVOLVIDO';

    return `
      <tr>
        <td class="fw-semibold">${escapeHtml(clientName)}</td>
        <td class="text-truncate" style="max-width: 250px;" title="${booksSummary}">${booksSummary}</td>
        <td class="text-nowrap">${formatDateTime(loan.dataEmprestimo)}</td>
        <td class="text-nowrap">${formatDateTime(loan.dataDevolucaoPrevista)}</td>
        <td class="text-nowrap">${formatDateTime(loan.dataDevolucaoReal)}</td>
        <td>${getLoanStatusBadge(loan.status)}</td>
        <td class="text-end text-nowrap">
          <button class="action-btn" title="Ver detalhes" onclick="showLoanDetails('${loan.id}')">👁</button>
          ${!isDevolvido ? `<button class="action-btn text-success" title="Devolver empréstimo" onclick="openReturnLoan('${loan.id}')">↩</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

async function openCreateLoan() {
  $('#loan-form').reset();
  $('#loan-form').classList.remove('was-validated');
  $('#loan-books-error').classList.add('d-none');
  $('#loan-dias').value = 14;
  updateLoanSelectedCount();

  const clientSelect = $('#loan-cliente');
  const booksList = $('#loan-books-list');

  clientSelect.innerHTML = '<option value="">Carregando clientes...</option>';
  booksList.innerHTML = '<div class="text-center text-secondary py-3">Carregando catálogo...</div>';

  loanModal.show();

  try {
    const [fetchedClients, fetchedBooks] = await Promise.all([
      request(CLIENTS_API_URL),
      request(BOOKS_API_URL)
    ]);
    clients = fetchedClients || [];
    books = fetchedBooks || [];

    // Clientes
    const activeClients = clients.filter(c => c.status === 'ATIVO');
    if (!activeClients.length) {
      clientSelect.innerHTML = '<option value="">Nenhum cliente ativo encontrado</option>';
    } else {
      clientSelect.innerHTML = '<option value="">Selecione um cliente ativo...</option>' +
        activeClients.map(c => `
          <option value="${c.id}">${escapeHtml(c.nome)} (Matrícula: ${escapeHtml(c.matricula)})</option>
        `).join('');
    }

    // Livros
    if (!books.length) {
      booksList.innerHTML = '<div class="text-center text-secondary py-3">Nenhum livro cadastrado.</div>';
    } else {
      booksList.innerHTML = books.map(b => {
        const hasStock = b.quantidade > 0;
        return `
          <label class="books-selection-item">
            <div class="d-flex align-items-center gap-2">
              <input type="checkbox" name="loan-books" value="${b.id}" class="form-check-input mt-0" ${!hasStock ? 'disabled' : ''} onchange="updateLoanSelectedCount()">
              <div>
                <strong class="d-block ${!hasStock ? 'text-muted' : ''}">${escapeHtml(b.titulo)}</strong>
                <small class="text-secondary">${escapeHtml(b.autor)}</small>
              </div>
            </div>
            <span class="badge ${hasStock ? 'badge-category' : 'bg-light text-muted'}">
              ${hasStock ? `${b.quantidade} disp.` : 'Sem estoque'}
            </span>
          </label>
        `;
      }).join('');
    }
  } catch (error) {
    showAlert('Erro ao carregar dados para o formulário de empréstimo: ' + error.message, 'danger');
  }
}

function updateLoanSelectedCount() {
  const selected = document.querySelectorAll('input[name="loan-books"]:checked');
  const counter = $('#loan-selected-count');
  if (counter) counter.textContent = `${selected.length} selecionado(s)`;
  if (selected.length > 0) {
    $('#loan-books-error')?.classList.add('d-none');
  }
}

async function saveLoan(event) {
  event.preventDefault();
  const form = $('#loan-form');
  const clienteId = $('#loan-cliente').value;
  const selectedCheckboxes = Array.from(document.querySelectorAll('input[name="loan-books"]:checked'));
  const livrosIds = selectedCheckboxes.map(cb => cb.value);
  const dias = Number($('#loan-dias').value) || 14;

  let valid = true;
  if (!clienteId) {
    form.classList.add('was-validated');
    valid = false;
  }

  if (livrosIds.length === 0) {
    $('#loan-books-error').classList.remove('d-none');
    valid = false;
  } else {
    $('#loan-books-error').classList.add('d-none');
  }

  if (!valid) return;

  const payload = {
    clienteId,
    livrosIds,
    diasParaDevolucao: dias
  };

  const button = $('#save-loan-btn');
  button.disabled = true;
  button.textContent = 'Registrando empréstimo...';

  try {
    await request(LOANS_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    loanModal.hide();
    showAlert('Empréstimo registrado com sucesso!', 'success');
    await loadLoans();
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    button.disabled = false;
    button.textContent = 'Confirmar empréstimo';
  }
}

async function showLoanDetails(id) {
  try {
    const loan = await request(`${LOANS_API_URL}/${id}`);
    const items = loan.itens || (loan.livros || []).map(b => ({ livro: b, dataDevolucao: loan.dataDevolucaoReal }));
    const booksList = items.map(item => {
      const b = item.livro || {};
      const isDevolvido = Boolean(item.dataDevolucao);
      const devolvidoBadge = isDevolvido
        ? `<span class="badge badge-status-ativo">Devolvido em ${formatDateTime(item.dataDevolucao)}</span>`
        : `<span class="badge badge-status-suspenso">Pendente</span>`;

      return `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">${escapeHtml(b.titulo)}</div>
            <small class="text-secondary">${escapeHtml(b.autor)} &bull; ISBN: ${escapeHtml(b.isbn)}</small>
            <div class="mt-1">${devolvidoBadge}</div>
          </div>
          <span class="badge badge-category">${b.categoria}</span>
        </li>
      `;
    }).join('');

    $('#loan-details-body').innerHTML = `
      <dl class="row mb-3">
        <dt class="col-4">Status</dt>
        <dd class="col-8">${getLoanStatusBadge(loan.status)}</dd>
        <dt class="col-4">Cliente</dt>
        <dd class="col-8"><strong>${escapeHtml(loan.cliente?.nome)}</strong> (Matrícula: ${escapeHtml(loan.cliente?.matricula)})</dd>
        <dt class="col-4">E-mail</dt>
        <dd class="col-8">${escapeHtml(loan.cliente?.email)}</dd>
        <dt class="col-4">Data Empréstimo</dt>
        <dd class="col-8">${formatDateTime(loan.dataEmprestimo)}</dd>
        <dt class="col-4">Previsão Devolução</dt>
        <dd class="col-8">${formatDateTime(loan.dataDevolucaoPrevista)}</dd>
        <dt class="col-4">Devolução Efetiva</dt>
        <dd class="col-8">${formatDateTime(loan.dataDevolucaoReal)}</dd>
      </dl>
      <h6 class="fw-semibold mb-2">Livros emprestados (${items.length})</h6>
      <ul class="list-group">
        ${booksList}
      </ul>
    `;
    loanDetailsModal.show();
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

async function openReturnLoan(id) {
  returningLoanId = id;
  const loan = loans.find(l => l.id === id);
  if (!loan) return;

  const penaltyAlert = $('#loan-return-penalty-alert');
  const booksList = $('#loan-return-books-list');
  const errorDiv = $('#loan-return-books-error');
  errorDiv.classList.add('d-none');

  // Verifica atraso
  const agora = new Date();
  const dataPrevista = new Date(loan.dataDevolucaoPrevista);
  const diffTime = agora.getTime() - dataPrevista.getTime();
  const diasAtraso = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diasAtraso > 0) {
    const diasSuspensao = diasAtraso * 2;
    penaltyAlert.innerHTML = `
      <div class="alert alert-warning py-2 mb-3">
        <strong>⚠️ Devolução em atraso (${diasAtraso} dia(s))!</strong><br>
        Esta entrega aplicará uma penalidade de <strong>${diasSuspensao} dias de suspensão</strong> ao cliente, impedindo novos empréstimos até o fim do prazo.
      </div>
    `;
    penaltyAlert.classList.remove('d-none');
  } else {
    penaltyAlert.innerHTML = '';
    penaltyAlert.classList.add('d-none');
  }

  // Renderiza livros para devolução parcial ou total
  const items = loan.itens || (loan.livros || []).map(b => ({ livro: b, dataDevolucao: loan.dataDevolucaoReal }));

  booksList.innerHTML = items.map(item => {
    const b = item.livro || {};
    const isDevolvido = Boolean(item.dataDevolucao);

    if (isDevolvido) {
      return `
        <div class="books-selection-item text-muted">
          <div class="d-flex align-items-center gap-2">
            <input type="checkbox" class="form-check-input mt-0" checked disabled>
            <div>
              <strong class="d-block text-decoration-line-through">${escapeHtml(b.titulo)}</strong>
              <small class="text-secondary">${escapeHtml(b.autor)}</small>
            </div>
          </div>
          <span class="badge bg-light text-secondary">Já devolvido</span>
        </div>
      `;
    }

    return `
      <label class="books-selection-item">
        <div class="d-flex align-items-center gap-2">
          <input type="checkbox" name="return-loan-books" value="${b.id}" class="form-check-input mt-0" checked>
          <div>
            <strong class="d-block">${escapeHtml(b.titulo)}</strong>
            <small class="text-secondary">${escapeHtml(b.autor)}</small>
          </div>
        </div>
        <span class="badge badge-status-suspenso">Pendente</span>
      </label>
    `;
  }).join('');

  loanReturnModal.show();
}

async function returnLoan() {
  if (!returningLoanId) return;

  const checkedCheckboxes = Array.from(document.querySelectorAll('input[name="return-loan-books"]:checked'));
  const livrosIds = checkedCheckboxes.map(cb => cb.value);

  if (livrosIds.length === 0) {
    $('#loan-return-books-error').classList.remove('d-none');
    return;
  }
  $('#loan-return-books-error').classList.add('d-none');

  const button = $('#confirm-return-loan-btn');
  button.disabled = true;
  button.textContent = 'Devolvendo...';

  try {
    const resultado = await request(`${LOANS_API_URL}/${returningLoanId}/devolver`, {
      method: 'PUT',
      body: JSON.stringify({ livrosIds })
    });
    loanReturnModal.hide();

    let msg = 'Devolução registrada com sucesso!';
    if (resultado.status === 'PARCIALMENTE_DEVOLVIDO') {
      msg = 'Devolução parcial realizada com sucesso! O acervo foi atualizado e o empréstimo segue em aberto para os livros restantes.';
    } else if (resultado.cliente?.status === 'SUSPENSO') {
      msg = `Devolução registrada com atraso! O cliente foi suspenso até ${formatDateOnly(resultado.cliente.dataFimSuspensao)}.`;
    }

    showAlert(msg, resultado.cliente?.status === 'SUSPENSO' ? 'warning' : 'success');
    await loadLoans();
  } catch (error) {
    showAlert(error.message, 'danger');
  } finally {
    returningLoanId = null;
    button.disabled = false;
    button.textContent = 'Confirmar devolução';
  }
}

function renderLoansError(message) {
  $('#loans-body').innerHTML = `<tr><td colspan="7" class="text-center text-danger py-5">${escapeHtml(message)}</td></tr>`;
}

// ------------------- UTILITÁRIOS -------------------
function showAlert(message, type) {
  $('#alert-area').innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;'
  }[char]));
}

// Funções expostas para chamadas nos botões da tabela
window.showDetails = showDetails;
window.openEdit = openEdit;
window.openDelete = openDelete;
window.showClientDetails = showClientDetails;
window.openEditClient = openEditClient;
window.openDeleteClient = openDeleteClient;
window.showLoanDetails = showLoanDetails;
window.openReturnLoan = openReturnLoan;
window.updateLoanSelectedCount = updateLoanSelectedCount;
