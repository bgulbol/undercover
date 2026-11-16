from fastapi.routing import APIRoute

from backend.main import app


def test_every_route_names_its_operation():
    for route in app.routes:
        if isinstance(route, APIRoute):
            assert route.operation_id == route.endpoint.__name__


def test_every_operation_has_a_one_line_docstring_and_no_optional_inputs():
    schema = app.openapi()
    components = schema["components"]["schemas"] if "components" in schema else {}
    for operations in schema["paths"].values():
        for operation in operations.values():
            assert operation["description"]
            assert "\n" not in operation["description"]
            for parameter in operation.get("parameters", []):
                assert parameter["required"], parameter["name"]
            if "requestBody" in operation:
                assert operation["requestBody"]["required"]
                content = operation["requestBody"]["content"]["application/json"]
                body = components[content["schema"]["$ref"].split("/")[-1]]
                assert set(body["properties"]) == set(body["required"])
