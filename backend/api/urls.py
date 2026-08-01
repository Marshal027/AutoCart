from django.urls import path
from . import views, planner_views

urlpatterns = [
    path("validate/", views.validate_input, name="validate-input"),
    path("finalize/", views.finalize_product, name="finalize-product"),
    path("process-list/", views.process_list, name="process-list"),
    path("planner/validate/", planner_views.plan_event_validate, name="plan-event-validate"),
    path("planner/finalize/", planner_views.plan_event_finalize, name="plan-event-finalize"),
]
