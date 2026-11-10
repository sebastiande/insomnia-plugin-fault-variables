# Fault Variables Template Tag for Insomnia

This plugin can read property files out of fault and includes the value of a property in your calls.

## YAML files

Files ending in `.yml` or `.yaml` are parsed as YAML. The property is a dot path into the nested structure:

```
{% faultVariable 'com.example.myproject:service-name', 'secrets-prod.yml', 'credentials.service.username' %}
```

The path has to point at a single value, not at an object or list. Values are returned exactly as written in the file (`0123` stays `0123`). In files with several YAML documents, the first document where the path points at a single value wins. All other files are read as Java properties files.

Limitations: top-level keys that contain dots (Spring-style flat keys like `spring.datasource.password`) and YAML merge keys (`<<`) are not supported.

## Insomnia Documentation:
* https://docs.insomnia.rest/insomnia/introduction-to-plugins
* https://docs.insomnia.rest/insomnia/template-tags

# Publish Package

Use `npm run release` command to publish the package.
