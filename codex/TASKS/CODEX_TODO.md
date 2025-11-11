# CODEX TODO

This document lists the Codex tasks in their recommended execution order.
Each task corresponds to a YAML file under `/codex/TASKS/`.

---

## 00 - Repository Setup

- [✅] 00_prepare_repository.yaml — Prepare the repository structure, move directories into place, update README and docker-compose config.

---

## 01–05 - Core Scaffolding

- [✅] 01_initialize_astro_frontend.yaml
- [✅] 02_setup_api_server_with_express_and_jwt_auth.yaml
- [✅] 03_design_postgresql_schema.yaml
- [✅] 04_implement_listing_ingestion_api_endpoint.yaml
- [✅] 05_admin_auth_route_and_middleware.yaml
- [✅] 06_frontend_directory_page_rendering.yaml
- [✅] 07_frontend_subcategory_ui_and_layout.yaml
- [✅] 08_setup_featured_listings_logic.yaml
- [✅] 09_add_category_meta_and_seo_controls.yaml
- [✅] 10_scaffold_python_crawler_agent.yaml
- [✅] 11_llm_field_generation_via_jinja2.yaml
- [✅] 12_post_listings_from_crawler_to_api_server.yaml
- [✅] 13_create_json_crawler_configuration_schema.yaml
- [✅] 14_scaffold_admin_ui_application.yaml
- [✅] 15_admin_ui:_listing_review_table.yaml
- [✅] 16_admin_ui:_category_location_approval.yaml
- [✅] 17_admin_ui:_seo_field_editor.yaml
- [✅] 18_deploy_web_+_api_to_railway.yaml
- [✅] 19_setup_logging,_healthchecks_and_monitoring.yaml
- [✅] 20_verify_dev_environment_bootstraps_cleanly.yaml
- [✅] 21_dockerize_api_server.yaml
- [✅] 22_dockerize_astro_frontend.yaml
- [✅] 23_docker_compose_local_dev.yaml
