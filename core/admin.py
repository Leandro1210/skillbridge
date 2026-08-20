from django.contrib import admin

from core.models import (
    Empresa,
    Entrega,
    Etapa,
    Habilidade,
    HabilidadeUsuario,
    Inscricao,
    PerfilUsuario,
    Projeto,
    RequisitoVaga,
    Usuario,
    Vaga,
)


# Inlines

class PerfilUsuarioInline(admin.StackedInline):
    model = PerfilUsuario
    can_delete = False
    verbose_name_plural = 'Perfil'


class EtapaInline(admin.TabularInline):
    model = Etapa
    extra = 1
    ordering = ['ordem']


class RequisitoVagaInline(admin.TabularInline):
    model = RequisitoVaga
    extra = 1


# Model admins

@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ['nome', 'email', 'nivel', 'xp_total', 'taxa_sucesso']
    search_fields = ['nome', 'email']
    list_filter = ['nivel']
    inlines = [PerfilUsuarioInline]


@admin.register(Projeto)
class ProjetoAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'dificuldade', 'nivel_minimo', 'created_at']
    list_filter = ['dificuldade', 'nivel_minimo']
    search_fields = ['titulo']
    inlines = [EtapaInline]


@admin.register(Etapa)
class EtapaAdmin(admin.ModelAdmin):
    list_display = ['projeto', 'ordem', 'formato_entrega']
    list_filter = ['formato_entrega']


@admin.register(Entrega)
class EntregaAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'etapa', 'status', 'xp_ganho', 'entregue_em']
    list_filter = ['status']
    search_fields = ['usuario__nome']
    readonly_fields = ['entregue_em']


@admin.register(Inscricao)
class InscricaoAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'projeto', 'status', 'iniciado_em']
    list_filter = ['status']
    search_fields = ['usuario__nome', 'projeto__titulo']
    readonly_fields = ['iniciado_em']


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ['nome', 'setor']
    search_fields = ['nome']


@admin.register(Vaga)
class VagaAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'empresa', 'tipo', 'localizacao', 'publicada_em']
    list_filter = ['tipo']
    search_fields = ['titulo']
    inlines = [RequisitoVagaInline]


@admin.register(Habilidade)
class HabilidadeAdmin(admin.ModelAdmin):
    list_display = ['nome', 'tipo']
    list_filter = ['tipo']


@admin.register(HabilidadeUsuario)
class HabilidadeUsuarioAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'habilidade', 'nivel', 'ultima_atualizacao']
    list_filter = ['nivel']


@admin.register(RequisitoVaga)
class RequisitoVagaAdmin(admin.ModelAdmin):
    list_display = ['vaga', 'habilidade', 'nivel_requerido']
